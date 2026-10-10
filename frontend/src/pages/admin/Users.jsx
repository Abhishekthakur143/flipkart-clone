import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchAdminUsers } from '../../redux/slices/adminSlice';
import API from '../../utils/api';
import toast from 'react-hot-toast';
import '../../components/admin/admin.css';

const Users = () => {
  const dispatch = useDispatch();
  const { users } = useSelector((state) => state.admin);
  const { user: me } = useSelector((state) => state.auth);
  const [query, setQuery] = useState('');

  useEffect(() => {
    dispatch(fetchAdminUsers());
  }, [dispatch]);

  const handleRoleChange = async (userId, role) => {
    try {
      await API.put(`/auth/admin/user/${userId}`, { role });
      toast.success('User role updated');
      dispatch(fetchAdminUsers());
    } catch (error) {
      toast.error('Failed to update role');
    }
  };

  const q = query.trim().toLowerCase();
  const list = q
    ? users.filter((u) => u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q))
    : users;

  return (
    <div>
      <div className="adm-head">
        <div>
          <h1 className="adm-title">All Users</h1>
          <p className="adm-sub">{users.length} registered users</p>
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search name or email"
          className="adm-input adm-search"
        />
      </div>

      <div className="adm-card">
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr><th>User ID</th><th>Name</th><th>Email</th><th>Joined On</th><th>Role</th><th>Action</th></tr>
            </thead>
            <tbody>
              {list.map((user) => (
                <tr key={user._id}>
                  <td className="adm-muted">...{user._id.slice(-6)}</td>
                  <td>
                    <div className="adm-user">
                      <span className="adm-avatar">{user.name?.charAt(0)?.toUpperCase() || 'U'}</span>
                      <span className="adm-strong">{user.name}</span>
                    </div>
                  </td>
                  <td>{user.email}</td>
                  <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                  <td><span className={`adm-badge ${user.role === 'admin' ? 'purple' : 'info'}`}>{user.role}</span></td>
                  <td>
                    {user._id === me?._id ? (
                      <span className="adm-muted">You</span>
                    ) : user.role === 'user' ? (
                      <button onClick={() => handleRoleChange(user._id, 'admin')} className="adm-btn sm">Make Admin</button>
                    ) : (
                      <button onClick={() => handleRoleChange(user._id, 'user')} className="adm-btn sm gray">Remove Admin</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {list.length === 0 && <div className="adm-empty">No users found.</div>}
        </div>
      </div>
    </div>
  );
};

export default Users;