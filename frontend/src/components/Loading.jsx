import { PulseLoader } from 'react-spinners';

const Loading = () => {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <PulseLoader color="#2874f0" size={15} />
    </div>
  );
};

export default Loading;