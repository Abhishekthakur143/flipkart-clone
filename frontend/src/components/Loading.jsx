import { PulseLoader } from 'react-spinners';
 
const Loading = () => {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="glass-pill px-8 py-5">
        <PulseLoader color="#2874f0" size={12} />
      </div>
    </div>
  );
};
 
export default Loading;
 