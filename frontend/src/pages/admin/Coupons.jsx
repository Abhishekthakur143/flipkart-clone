import { useState, useEffect } from 'react';
import API from '../../utils/api';
import toast from 'react-hot-toast';
import '../../components/admin/admin.css';

const EMPTY = { code: '', discountType: 'percentage', discountValue: '', minimumOrderValue: '', maximumDiscount: '', validFrom: '', validTo: '' };

const couponState = (c) => {
  const now = new Date();
  if (now < new Date(c.validFrom)) return ['Upcoming', 'info'];
  if (now > new Date(c.validTo)) return ['Expired', 'bad'];
  return ['Active', 'ok'];
};

const Coupons = () => {
  const [coupons, setCoupons] = useState([]);
  const [form, setForm] = useState(EMPTY);

  useEffect(() => {
    fetchCoupons();
  }, []);

  const fetchCoupons = async () => {
    const { data } = await API.get('/coupons/admin/all');
    setCoupons(data.coupons);
  };

  const handleInputChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await API.post('/coupons/admin/new', { ...form, discountValue: Number(form.discountValue), minimumOrderValue: Number(form.minimumOrderValue) || 0, maximumDiscount: Number(form.maximumDiscount) || 0 });
      toast.success('Coupon Created!');
      setForm(EMPTY);
      fetchCoupons();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this coupon?')) return;
    await API.delete(`/coupons/admin/${id}`);
    toast.success('Deleted');
    fetchCoupons();
  };

  return (
    <div>
      <div className="adm-head">
        <div>
          <h1 className="adm-title">Manage Coupons</h1>
          <p className="adm-sub">{coupons.length} coupons</p>
        </div>
      </div>

      <div className="adm-split">
        <div className="adm-card adm-pad">
          <h2 className="adm-card-title">Create Coupon</h2>
          <form onSubmit={handleSubmit} className="adm-form">
            <div>
              <label className="adm-label">Coupon Code</label>
              <input type="text" name="code" value={form.code} onChange={handleInputChange} placeholder="Coupon Code (e.g. SALE20)" className="adm-input" required />
            </div>
            <div>
              <label className="adm-label">Discount Type</label>
              <select name="discountType" value={form.discountType} onChange={handleInputChange} className="adm-select">
                <option value="percentage">Percentage (%)</option>
                <option value="flat">Flat (₹)</option>
              </select>
            </div>
            <div>
              <label className="adm-label">Discount Value</label>
              <input type="number" name="discountValue" value={form.discountValue} onChange={handleInputChange} placeholder="Discount Value" className="adm-input" required />
            </div>
            <div>
              <label className="adm-label">Min Order Amount</label>
              <input type="number" name="minimumOrderValue" value={form.minimumOrderValue} onChange={handleInputChange} placeholder="Min Order Amount" className="adm-input" />
            </div>
            {form.discountType === 'percentage' && (
              <div>
                <label className="adm-label">Max Discount (₹)</label>
                <input type="number" name="maximumDiscount" value={form.maximumDiscount} onChange={handleInputChange} placeholder="Max Discount (₹)" className="adm-input" />
              </div>
            )}
            <div className="adm-row2">
              <div>
                <label className="adm-label">Valid From</label>
                <input type="date" name="validFrom" value={form.validFrom} onChange={handleInputChange} className="adm-input" required />
              </div>
              <div>
                <label className="adm-label">Valid To</label>
                <input type="date" name="validTo" value={form.validTo} onChange={handleInputChange} className="adm-input" required />
              </div>
            </div>
            <button type="submit" className="adm-btn block">CREATE COUPON</button>
          </form>
        </div>

        <div className="adm-card">
          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead>
                <tr><th>Code</th><th>Discount</th><th>Validity</th><th>Status</th><th>Action</th></tr>
              </thead>
              <tbody>
                {coupons.map((c) => {
                  const [label, tone] = couponState(c);
                  return (
                    <tr key={c._id}>
                      <td><span className="adm-code">{c.code}</span></td>
                      <td className="adm-strong">{c.discountType === 'percentage' ? `${c.discountValue}%` : `₹${c.discountValue}`}</td>
                      <td className="adm-muted">{new Date(c.validFrom).toLocaleDateString()} - {new Date(c.validTo).toLocaleDateString()}</td>
                      <td><span className={`adm-badge ${tone}`}>{label}</span></td>
                      <td><button onClick={() => handleDelete(c._id)} className="adm-del-text">Delete</button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {coupons.length === 0 && <div className="adm-empty">No coupons yet.</div>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Coupons;