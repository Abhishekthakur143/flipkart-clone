import { Link } from 'react-router-dom';
import {
  HiOutlineMail,
  HiOutlinePhone,
  HiOutlineLocationMarker,
  HiOutlineChevronUp,
  HiOutlineTruck,
  HiOutlineShieldCheck,
  HiOutlineRefresh,
} from 'react-icons/hi';
import SellOnStoreButton from './seller/SellOnStoreButton';
import './footer.css';
 
const COLUMNS = [
  { title: 'ABOUT', items: ['Contact Us', 'About Us', 'Careers', 'Flipkart Stories', 'Press', 'Corporate Info'] },
  { title: 'HELP', items: ['Payments', 'Shipping', 'Cancellation & Returns', 'FAQ', 'Report Infringement'] },
  { title: 'POLICY', items: ['Return Policy', 'Terms of Use', 'Security', 'Privacy', 'Sitemap', 'Grievance Redressal'] },
];
 
const TRUST = [
  { Icon: HiOutlineTruck, title: 'Fast delivery', text: 'Right to your doorstep' },
  { Icon: HiOutlineShieldCheck, title: 'Secure payments', text: '100% protected checkout' },
  { Icon: HiOutlineRefresh, title: 'Easy returns', text: 'Hassle free, no questions' },
];
 
const Footer = () => {
  return (
    <footer className="ft">
      {/* Side par chhupa "Become a seller" tab (arrow dabane par nikalta hai) */}
      <SellOnStoreButton />
 
      <div className="ft-wrap">
        {/* Trust strip */}
        <div className="ft-trust">
          {TRUST.map(({ Icon, title, text }) => (
            <div key={title} className="ft-trust-i">
              <span className="ft-trust-ico"><Icon /></span>
              <span>
                <strong>{title}</strong>
                <small>{text}</small>
              </span>
            </div>
          ))}
        </div>
 
        <div className="ft-main">
          {/* Brand */}
          <div className="ft-brand">
            <Link to="/" className="ft-logo">
              <span className="ft-logo-mark">★</span>
              <span className="ft-logo-name">Flipkart</span>
            </Link>
            <p className="ft-tag">
              Everything you love, delivered fast. Shop mobiles, fashion, electronics and more at the best prices.
            </p>
          </div>
 
          {/* About / Help / Policy */}
          {COLUMNS.map((col) => (
            <div key={col.title}>
              <h3 className="ft-title">{col.title}</h3>
              <ul className="ft-list">
                {col.items.map((item) => (
                  <li key={item}>
                    <Link to="/" className="ft-link">{item}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
 
          {/* Contact */}
          <div>
            <h3 className="ft-title">CONTACT</h3>
            <div className="ft-contact">
              <div className="ft-c">
                <span className="ft-c-ico"><HiOutlineLocationMarker /></span>
                <p>Buildings Alyssa, Begonia &amp; Clove Embassy Tech Village, Bangalore, 560103</p>
              </div>
              <div className="ft-c">
                <span className="ft-c-ico"><HiOutlineMail /></span>
                <p>support@flipkartclone.com</p>
              </div>
              <div className="ft-c">
                <span className="ft-c-ico"><HiOutlinePhone /></span>
                <p>1800-202-9898</p>
              </div>
            </div>
          </div>
        </div>
      </div>
 
      {/* Bottom Footer */}
      <div className="ft-bottom">
        <div className="ft-bottom-in">
          <p className="ft-copy">
            © {new Date().getFullYear()} Flipkart Clone. For demonstration purposes only.
          </p>
 
          <div className="ft-pays">
            {['UPI', 'Cards', 'Net Banking', 'COD'].map((p) => (
              <span key={p} className="ft-pay-chip">{p}</span>
            ))}
          </div>
 
          <div className="ft-top-wrap">
            <p className="ft-top-text">Back to top</p>
            <button
              type="button"
              className="ft-top"
              aria-label="Back to top"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            >
              <HiOutlineChevronUp />
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};
 
export default Footer;
