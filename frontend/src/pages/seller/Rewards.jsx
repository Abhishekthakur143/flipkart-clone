import MyRewards from '../../components/rewards/MyRewards';
import API from '../../utils/api';

const fetcher = () => API.get('/seller/rewards');

const SellerRewards = () => <MyRewards fetcher={fetcher} title="My rewards" />;

export default SellerRewards;
