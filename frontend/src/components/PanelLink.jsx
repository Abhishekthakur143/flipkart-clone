import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { PANELS } from '../utils/panels';

// Navbar ke profile menu me "Settings" ke upar laga do. Sirf staff ko dikhta hai
// (admin / manager / superadmin / seller); customer ko kuch nahi dikhta.
// Props: className (menu ke dusre links jaisi class), onClick (menu band karne ke liye), children (icon)
const PanelLink = ({ className, onClick, children }) => {
  const user = useSelector((s) => s.auth?.user);
  const panel = user && PANELS[user.role];
  if (!panel) return null;
  return (
    <Link to={panel.path} className={className} onClick={onClick}>
      {children}{panel.label}
    </Link>
  );
};

export default PanelLink;
