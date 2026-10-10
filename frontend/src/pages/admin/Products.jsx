import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchAdminProducts, deleteProduct } from '../../redux/slices/adminSlice';
import { formatPrice } from '../../utils/constants';
import { HiOutlinePencil, HiOutlineTrash, HiOutlinePlus } from 'react-icons/hi';
import toast from 'react-hot-toast';
import '../../components/admin/admin.css';

const Products = () => {
  const dispatch = useDispatch();
  const { products } = useSelector((state) => state.admin);
  const [query, setQuery] = useState('');

  useEffect(() => {
    dispatch(fetchAdminProducts());
  }, [dispatch]);

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      dispatch(deleteProduct(id));
      toast.success('Product Deleted');
    }
  };

  const q = query.trim().toLowerCase();
  const list = q
    ? products.filter((p) => p.name?.toLowerCase().includes(q) || p.category?.name?.toLowerCase().includes(q))
    : products;

  return (
    <div>
      <div className="adm-head">
        <div>
          <h1 className="adm-title">All Products</h1>
          <p className="adm-sub">{products.length} products in your store</p>
        </div>
        <div className="adm-actions">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search product or category"
            className="adm-input adm-search"
          />
          <Link to="/admin/product/new" className="adm-btn">
            <HiOutlinePlus /> Add Product
          </Link>
        </div>
      </div>

      <div className="adm-card">
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr><th>ID</th><th>Product</th><th>Category</th><th>Stock</th><th>Price</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {list.map((prod) => (
                <tr key={prod._id}>
                  <td className="adm-muted">...{prod._id.slice(-6)}</td>
                  <td>
                    <div className="adm-prod">
                      <img src={prod.images[0]?.url} alt="" />
                      <span>{prod.name}</span>
                    </div>
                  </td>
                  <td>{prod.category?.name || 'N/A'}</td>
                  <td>
                    <span className={`adm-badge ${prod.stock > 0 ? 'ok' : 'bad'}`}>
                      {prod.stock > 0 ? `In Stock (${prod.stock})` : 'Out of Stock'}
                    </span>
                  </td>
                  <td className="adm-strong">{formatPrice(prod.price)}</td>
                  <td>
                    <div className="adm-actions">
                      <Link to={`/admin/product/${prod._id}`} className="adm-icon-btn edit" aria-label="Edit"><HiOutlinePencil /></Link>
                      <button onClick={() => handleDelete(prod._id)} className="adm-icon-btn del" aria-label="Delete"><HiOutlineTrash /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {list.length === 0 && <div className="adm-empty">No products found.</div>}
        </div>
      </div>
    </div>
  );
};

export default Products;