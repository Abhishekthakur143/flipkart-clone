const bcrypt = require('bcryptjs');
const User = require('../models/User');
const ErrorHandler = require('../utils/errorHandler');
const {
  signAdminUnlock,
  hasValidUnlock,
  unlockMinutes,
  securityEnabled,
} = require('../middleware/auth');

const MAX_FAILS = 5;
const LOCK_MS = 15 * 60 * 1000;
const WITH_SECRETS = '+password +adminCodeHash +adminAnswerHash +adminFailed +adminLockUntil';

const clean = (s) => String(s ?? '').trim();
// Answer ko case/extra spaces se farak nahi padta
const cleanAnswer = (s) => clean(s).toLowerCase().replace(/\s+/g, ' ');

const loadAdmin = (id) => User.findById(id).select(WITH_SECRETS);

const assertNotLocked = (u) => {
  if (u.adminLockUntil && u.adminLockUntil.getTime() > Date.now()) {
    const mins = Math.ceil((u.adminLockUntil.getTime() - Date.now()) / 60000);
    throw new ErrorHandler(
      `Too many wrong attempts. Try again in ${mins} minute${mins === 1 ? '' : 's'}.`,
      429
    );
  }
};

// NOTE: galat details par 400 dete hain, 401 nahi: frontend 401 par logout kar deta hai.
const registerFailure = async (u) => {
  u.adminFailed = (u.adminFailed || 0) + 1;
  let err;
  if (u.adminFailed >= MAX_FAILS) {
    u.adminLockUntil = new Date(Date.now() + LOCK_MS);
    u.adminFailed = 0;
    err = new ErrorHandler('Too many wrong attempts. The panel is locked for 15 minutes.', 429);
  } else {
    const left = MAX_FAILS - u.adminFailed;
    err = new ErrorHandler(`Details don't match. ${left} attempt${left === 1 ? '' : 's'} left.`, 400);
  }
  await u.save({ validateBeforeSave: false });
  return err;
};

const tokenPayload = (u) => ({
  unlockToken: signAdminUnlock(u),
  expiresInSec: unlockMinutes() * 60,
});

// GET /admin/security/status
exports.status = async (req, res, next) => {
  try {
    const u = await User.findById(req.user._id).select('+adminCodeHash +adminLockUntil');
    const required = securityEnabled();
    const locked = !!(u.adminLockUntil && u.adminLockUntil.getTime() > Date.now());
    res.json({
      success: true,
      required,
      configured: !!u.adminCodeHash,
      question: u.adminCodeHash ? u.adminQuestion : '',
      unlocked: required ? hasValidUnlock(req) : true,
      lockedUntil: locked ? u.adminLockUntil : null,
      unlockMinutes: unlockMinutes(),
    });
  } catch (e) {
    next(e);
  }
};

// POST /admin/security/setup { password, codeWord, question, answer }
// Sirf tab chalta hai jab is admin ka code word abhi set nahi hai.
exports.setup = async (req, res, next) => {
  try {
    if (!securityEnabled()) return next(new ErrorHandler('Admin security is switched off on the server', 400));

    const password = String(req.body.password ?? '');
    const codeWord = clean(req.body.codeWord);
    const question = clean(req.body.question);
    const answer = cleanAnswer(req.body.answer);

    if (codeWord.length < 6 || codeWord.length > 64) {
      return next(new ErrorHandler('Code word must be 6 to 64 characters', 400));
    }
    if (question.length < 5 || question.length > 160) {
      return next(new ErrorHandler('Security question must be 5 to 160 characters', 400));
    }
    if (answer.length < 2 || answer.length > 100) {
      return next(new ErrorHandler('Security answer must be 2 to 100 characters', 400));
    }

    const u = await loadAdmin(req.user._id);
    if (!u) return next(new ErrorHandler('Admin not found', 404));
    if (u.adminCodeHash) return next(new ErrorHandler('Admin lock is already set up.', 400));
    assertNotLocked(u);

    if (!(await u.comparePassword(password))) return next(await registerFailure(u));
    if (await u.comparePassword(codeWord)) {
      return next(new ErrorHandler('Code word must be different from your password', 400));
    }

    u.adminCodeHash = await bcrypt.hash(codeWord, 10);
    u.adminAnswerHash = await bcrypt.hash(answer, 10);
    u.adminQuestion = question;
    u.adminFailed = 0;
    u.adminLockUntil = undefined;
    await u.save({ validateBeforeSave: false });

    res.status(201).json({ success: true, message: 'Admin lock is set up', ...tokenPayload(u) });
  } catch (e) {
    next(e);
  }
};

// POST /admin/security/unlock { password, codeWord, answer }
exports.unlock = async (req, res, next) => {
  try {
    if (!securityEnabled()) return next(new ErrorHandler('Admin security is switched off on the server', 400));

    const password = String(req.body.password ?? '');
    const codeWord = clean(req.body.codeWord);
    const answer = cleanAnswer(req.body.answer);

    const u = await loadAdmin(req.user._id);
    if (!u) return next(new ErrorHandler('Admin not found', 404));
    if (!u.adminCodeHash || !u.adminAnswerHash) {
      return next(new ErrorHandler('Admin lock is not set up yet.', 400));
    }
    assertNotLocked(u);

    // Teeno hamesha check hote hain, taaki pata na chale kaun sa galat tha
    const [okPassword, okCode, okAnswer] = await Promise.all([
      u.comparePassword(password),
      bcrypt.compare(codeWord, u.adminCodeHash),
      bcrypt.compare(answer, u.adminAnswerHash),
    ]);
    if (!(okPassword && okCode && okAnswer)) return next(await registerFailure(u));

    if (u.adminFailed || u.adminLockUntil) {
      u.adminFailed = 0;
      u.adminLockUntil = undefined;
      await u.save({ validateBeforeSave: false });
    }

    res.json({ success: true, message: 'Admin panel unlocked', ...tokenPayload(u) });
  } catch (e) {
    next(e);
  }
};
