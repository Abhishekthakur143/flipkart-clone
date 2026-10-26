// Vercel is file ko serverless function ki tarah chalata hai.
// Saare requests (vercel.json ke rewrite se) yahin aate hain aur Express app ko jate hain.
module.exports = require('../server');