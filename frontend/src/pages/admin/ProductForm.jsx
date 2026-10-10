import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { createProduct, updateProduct, fetchAdminProducts } from '../../redux/slices/adminSlice';
import { fetchCategories } from '../../redux/slices/categorySlice';
import toast from 'react-hot-toast';
import '../../components/admin/admin.css';

const readFile = (file) =>
  new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(file);
  });

const ProductForm = () => {
  const { id } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { products } = useSelector((state) => state.admin);
  const { categories } = useSelector((state) => state.categories);

  const isEdit = Boolean(id);

  const [formData, setFormData] = useState({
    name: '', description: '', price: '', cuttedPrice: '', category: '', stock: '', brand: '', highlights: '', specifications: '', isFeatured: false, isTrending: false,
  });
  const [images, setImages] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    dispatch(fetchCategories());
    if (isEdit && products.length === 0) dispatch(fetchAdminProducts());
  }, [dispatch, isEdit]);

  useEffect(() => {
    if (isEdit && products.length > 0) {
      const product = products.find((p) => p._id === id);
      if (product) {
        setFormData({
          name: product.name, description: product.description, price: product.price,
          cuttedPrice: product.cuttedPrice, category: product.category?._id || '',
          stock: product.stock, brand: product.brand, highlights: product.highlights?.join(', ') || '',
          specifications: JSON.stringify(product.specifications || []),
          isFeatured: product.isFeatured, isTrending: product.isTrending,
        });
        setImagePreviews(product.images.map((img) => img.url));
      }
    }
  }, [isEdit, id, products]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({ ...formData, [name]: type === 'checkbox' ? checked : value });
  };

  // Previews ab turant dikhte hain (pehle next render tak ruk jaate the)
  const handleImageChange = async (e) => {
    const files = Array.from(e.target.files);
    setImages(files);
    setImagePreviews(await Promise.all(files.map(readFile)));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    // Convert base64 images for cloudinary upload
    const uploadedImages = await Promise.all(images.map(readFile));

    const payload = {
      ...formData,
      price: Number(formData.price),
      cuttedPrice: Number(formData.cuttedPrice),
      stock: Number(formData.stock),
      highlights: (formData.highlights || '').split(',').map((h) => h.trim()).filter(Boolean),
      images: isEdit ? imagePreviews : uploadedImages,
      // ✅ SPECIFICATIONS KO PARSE KARTA HAI
      specifications: formData.specifications ? JSON.parse(formData.specifications) : [],
    };

    if (isEdit) {
      const result = await dispatch(updateProduct({ id, productData: payload }));
      if (updateProduct.fulfilled.match(result)) {
        toast.success('Product Updated');
        navigate('/admin/products');
      } else {
        toast.error(result.payload || 'Failed to update product');
      }
    } else {
      const result = await dispatch(createProduct(payload));
      if (createProduct.fulfilled.match(result)) {
        toast.success('Product Created');
        navigate('/admin/products');
      } else {
        toast.error(result.payload || 'Failed to create product. Check backend terminal.');
      }
    }
    setSaving(false);
  };

  return (
    <div style={{ maxWidth: 820, margin: '0 auto' }}>
      <div className="adm-head">
        <div>
          <h1 className="adm-title">{isEdit ? 'Edit Product' : 'Add New Product'}</h1>
          <p className="adm-sub">{isEdit ? 'Product ki details update karo.' : 'Naya product store me add karo.'}</p>
        </div>
      </div>

      <div className="adm-card adm-pad">
        <form onSubmit={handleSubmit} className="adm-form">
          <div className="adm-row2">
            <div>
              <label className="adm-label">Product Name</label>
              <input type="text" name="name" value={formData.name} onChange={handleInputChange} placeholder="Product Name" className="adm-input" required />
            </div>
            <div>
              <label className="adm-label">Brand</label>
              <input type="text" name="brand" value={formData.brand} onChange={handleInputChange} placeholder="Brand" className="adm-input" />
            </div>
          </div>

          <div>
            <label className="adm-label">Description</label>
            <textarea name="description" value={formData.description} onChange={handleInputChange} placeholder="Description" className="adm-textarea" rows="4" required></textarea>
          </div>

          <div className="adm-row3">
            <div>
              <label className="adm-label">Selling Price (₹)</label>
              <input type="number" name="price" value={formData.price} onChange={handleInputChange} placeholder="Selling Price (₹)" className="adm-input" required />
            </div>
            <div>
              <label className="adm-label">MRP (₹)</label>
              <input type="number" name="cuttedPrice" value={formData.cuttedPrice} onChange={handleInputChange} placeholder="MRP (₹)" className="adm-input" />
            </div>
            <div>
              <label className="adm-label">Stock</label>
              <input type="number" name="stock" value={formData.stock} onChange={handleInputChange} placeholder="Stock" className="adm-input" required />
            </div>
          </div>

          <div>
            <label className="adm-label">Category</label>
            <select name="category" value={formData.category} onChange={handleInputChange} className="adm-select" required>
              <option value="">Select Category</option>
              {categories.map((cat) => <option key={cat._id} value={cat._id}>{cat.name}</option>)}
            </select>
          </div>

          <div>
            <label className="adm-label">Highlights</label>
            <input type="text" name="highlights" value={formData.highlights} onChange={handleInputChange} placeholder="Highlights (comma separated)" className="adm-input" />
          </div>

          <div className="adm-checks">
            <label className="adm-check"><input type="checkbox" name="isFeatured" checked={formData.isFeatured} onChange={handleInputChange} /> Featured</label>
            <label className="adm-check"><input type="checkbox" name="isTrending" checked={formData.isTrending} onChange={handleInputChange} /> Trending</label>
          </div>

          <div>
            <label className="adm-label">Product Images</label>
            <label className="adm-upload">
              Click to choose images
              <small>PNG, JPG, WEBP (multiple allowed)</small>
              <input type="file" multiple accept="image/*" onChange={handleImageChange} />
            </label>
            {imagePreviews.length > 0 && (
              <div className="adm-previews">
                {imagePreviews.map((img, i) => <img key={i} src={img} alt="Preview" />)}
              </div>
            )}
          </div>

          <button type="submit" className="adm-btn block" disabled={saving} style={{ height: 50 }}>
            {saving ? 'Saving...' : isEdit ? 'UPDATE PRODUCT' : 'CREATE PRODUCT'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ProductForm;