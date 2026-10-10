import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { updateProfile, updatePassword, addAddress, deleteAddress } from '../redux/slices/authSlice';
import {
  HiOutlineUser,
  HiOutlineMail,
  HiOutlinePhone,
  HiOutlineHome,
  HiOutlineOfficeBuilding,
  HiOutlineHashtag,
  HiOutlineLocationMarker,
  HiOutlineLockClosed,
  HiOutlinePlus,
  HiOutlineTrash,
} from 'react-icons/hi';
import toast from 'react-hot-toast';
import { Field, strengthOf } from '../components/AuthShell';
import './profile.css';

const EMPTY_ADDRESS = { name: '', phone: '', addressLine1: '', city: '', state: '', pincode: '', addressType: 'Home' };

const Profile = () => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const [activeTab, setActiveTab] = useState('profile');

  // Profile State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  // Password State
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Address State
  const [addressForm, setAddressForm] = useState(EMPTY_ADDRESS);
  const [showAddressForm, setShowAddressForm] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setEmail(user.email || '');
      setPhone(user.phone || '');
    }
  }, [user]);

  const errMsg = (r) => r?.payload?.message || r?.payload || r?.error?.message || 'Something went wrong';

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    const r = await dispatch(updateProfile({ name, email, phone }));
    if (updateProfile.fulfilled.match(r)) toast.success('Profile Updated');
    else toast.error(errMsg(r));
  };

  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    if (newPassword.length < 6) return toast.error('New password must be at least 6 characters');
    if (newPassword !== confirmPassword) return toast.error('Passwords do not match');
    const r = await dispatch(updatePassword({ oldPassword, newPassword }));
    if (updatePassword.fulfilled.match(r)) {
      setOldPassword(''); setNewPassword(''); setConfirmPassword('');
      toast.success('Password Updated');
    } else {
      toast.error(errMsg(r));   // e.g. "Old password is incorrect"
    }
  };

  const handleAddAddress = async (e) => {
    e.preventDefault();
    const r = await dispatch(addAddress(addressForm));
    if (addAddress.fulfilled.match(r)) {
      setShowAddressForm(false);
      setAddressForm(EMPTY_ADDRESS);
      toast.success('Address Added');
    } else toast.error(errMsg(r));
  };

  const handleDeleteAddress = async (id) => {
    const r = await dispatch(deleteAddress(id));
    if (deleteAddress.fulfilled.match(r)) toast.success('Address Deleted');
    else toast.error(errMsg(r));
  };

  const setAddr = (key) => (e) => setAddressForm({ ...addressForm, [key]: e.target.value });

  const tabs = [
    { id: 'profile', label: 'Personal Info', icon: HiOutlineUser },
    { id: 'address', label: 'Manage Addresses', icon: HiOutlineLocationMarker },
    { id: 'password', label: 'Change Password', icon: HiOutlineLockClosed },
  ];

  const strength = strengthOf(newPassword);

  return (
    <div className="pf">
      {/* Sidebar Tabs */}
      <div className="pf-side">
        <div className="pf-user">
          <div className="pf-avatar">{user?.name?.charAt(0).toUpperCase()}</div>
          <div>
            <p className="pf-hello">Hello,</p>
            <p className="pf-uname">{user?.name}</p>
          </div>
        </div>
        <div className="pf-tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pf-tab ${activeTab === tab.id ? 'on' : ''}`}
            >
              <tab.icon /> {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content Area */}
      <div className="pf-card">
        {activeTab === 'profile' && (
          <form onSubmit={handleProfileUpdate} className="pf-form">
            <div>
              <h2 className="pf-title">Personal Information</h2>
              <p className="pf-sub">Update your name, email and phone number.</p>
            </div>
            <div className="pf-grid two">
              <Field icon={HiOutlineUser} label="Full name" type="text" required value={name} onChange={(e) => setName(e.target.value)} />
              <Field icon={HiOutlineMail} label="Email address" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <Field icon={HiOutlinePhone} label="Phone number" type="text" value={phone} onChange={(e) => setPhone(e.target.value)} />
            <button type="submit" className="pf-btn fit">SAVE</button>
          </form>
        )}

        {activeTab === 'address' && (
          <div>
            <div className="pf-head-row">
              <div>
                <h2 className="pf-title">Manage Addresses</h2>
                <p className="pf-sub">Saved addresses are used at checkout.</p>
              </div>
              <button onClick={() => setShowAddressForm(!showAddressForm)} className="pf-btn ghost">
                <HiOutlinePlus /> {showAddressForm ? 'Close' : 'Add New'}
              </button>
            </div>

            {showAddressForm && (
              <form onSubmit={handleAddAddress} className="pf-box">
                <div className="pf-grid two">
                  <Field icon={HiOutlineUser} label="Name" type="text" required value={addressForm.name} onChange={setAddr('name')} />
                  <Field icon={HiOutlinePhone} label="Phone" type="text" required value={addressForm.phone} onChange={setAddr('phone')} />
                </div>
                <Field icon={HiOutlineHome} label="Address (House No, Street)" type="text" required value={addressForm.addressLine1} onChange={setAddr('addressLine1')} />
                <div className="pf-grid three">
                  <Field icon={HiOutlineOfficeBuilding} label="City" type="text" required value={addressForm.city} onChange={setAddr('city')} />
                  <Field icon={HiOutlineLocationMarker} label="State" type="text" required value={addressForm.state} onChange={setAddr('state')} />
                  <Field icon={HiOutlineHashtag} label="Pincode" type="text" required value={addressForm.pincode} onChange={setAddr('pincode')} />
                </div>
                <div className="pf-seg">
                  {['Home', 'Work'].map((type) => (
                    <button
                      key={type}
                      type="button"
                      className={addressForm.addressType === type ? 'on' : ''}
                      onClick={() => setAddressForm({ ...addressForm, addressType: type })}
                    >
                      {type}
                    </button>
                  ))}
                </div>
                <button type="submit" className="pf-btn fit">SAVE ADDRESS</button>
              </form>
            )}

            {!user?.addresses?.length ? (
              <div className="pf-empty">No addresses found.</div>
            ) : (
              <div className="pf-addrs">
                {user.addresses.map((addr, i) => (
                  <div key={addr._id || i} className="pf-addr">
                    <div>
                      <span className={`pf-tag ${addr.addressType === 'Work' ? 'work' : ''}`}>{addr.addressType}</span>
                      <p className="pf-addr-name">{addr.name} <span>({addr.phone})</span></p>
                      <p className="pf-addr-text">{addr.addressLine1}, {addr.city}, {addr.state} - {addr.pincode}</p>
                    </div>
                    <button onClick={() => handleDeleteAddress(addr._id)} className="pf-del" aria-label="Delete address">
                      <HiOutlineTrash />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'password' && (
          <form onSubmit={handlePasswordUpdate} className="pf-form">
            <div>
              <h2 className="pf-title">Change Password</h2>
              <p className="pf-sub">Use at least 6 characters. A longer mix of letters, numbers and symbols is stronger.</p>
            </div>
            <Field icon={HiOutlineLockClosed} label="Current password" type="password" required autoComplete="current-password" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} />
            <Field icon={HiOutlineLockClosed} label="New password" type="password" required autoComplete="new-password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
            {newPassword && (
              <div className="auth-strength">
                {[0, 1, 2].map((i) => <i key={i} className={i < strength ? `s${strength}` : ''} />)}
              </div>
            )}
            <Field icon={HiOutlineLockClosed} label="Confirm new password" type="password" required autoComplete="new-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
            <button type="submit" className="pf-btn fit">UPDATE PASSWORD</button>
          </form>
        )}
      </div>
    </div>
  );
};

export default Profile;