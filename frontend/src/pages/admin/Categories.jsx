import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchCategories } from '../../redux/slices/categorySlice';
import API from '../../utils/api';
import toast from 'react-hot-toast';
import '../../components/admin/admin.css';

const Categories = () => {
  const dispatch = useDispatch();
  const { categories } = useSelector((state) => state.categories);
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('');

  useEffect(() => {
    dispatch(fetchCategories());
  }, [dispatch]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await API.post('/categories/admin/new', { name, icon });
      toast.success('Category Added');
      setName(''); setIcon('');
      dispatch(fetchCategories());
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to add category');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Delete this category?')) {
      await API.delete(`/categories/admin/${id}`);
      toast.success('Deleted');
      dispatch(fetchCategories());
    }
  };

  return (
    <div>
      <div className="adm-head">
        <div>
          <h1 className="adm-title">Manage Categories</h1>
          <p className="adm-sub">{categories.length} categories</p>
        </div>
      </div>

      <div className="adm-split">
        <div className="adm-card adm-pad">
          <h2 className="adm-card-title">Add New Category</h2>
          <form onSubmit={handleSubmit} className="adm-form">
            <div>
              <label className="adm-label">Category Name</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Category Name (e.g. Electronics)" className="adm-input" required />
            </div>
            <div>
              <label className="adm-label">Icon</label>
              <input type="text" value={icon} onChange={(e) => setIcon(e.target.value)} placeholder="Icon Emoji (e.g. 🔌)" className="adm-input" required />
            </div>
            <button type="submit" className="adm-btn block">ADD CATEGORY</button>
          </form>
        </div>

        <div className="adm-card">
          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead>
                <tr><th>Icon</th><th>Name</th><th>Slug</th><th>Action</th></tr>
              </thead>
              <tbody>
                {categories.map((cat) => (
                  <tr key={cat._id}>
                    <td className="adm-emoji">{cat.icon}</td>
                    <td className="adm-strong">{cat.name}</td>
                    <td className="adm-muted">{cat.slug}</td>
                    <td><button onClick={() => handleDelete(cat._id)} className="adm-del-text">Delete</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {categories.length === 0 && <div className="adm-empty">No categories yet.</div>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Categories;