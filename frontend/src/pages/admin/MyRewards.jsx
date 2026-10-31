import MyRewards from '../../components/rewards/MyRewards';
import API from '../../utils/api';

const fetcher = () => API.get('/admin/rewards/mine');

const AdminMyRewards = () => <MyRewards fetcher={fetcher} title="My rewards" />;

export default AdminMyRewards;
