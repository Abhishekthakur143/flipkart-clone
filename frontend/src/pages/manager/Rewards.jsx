import MyRewards from '../../components/rewards/MyRewards';
import API from '../../utils/api';

const fetcher = () => API.get('/manager/rewards');

const ManagerRewards = () => <MyRewards fetcher={fetcher} title="My rewards" />;

export default ManagerRewards;
