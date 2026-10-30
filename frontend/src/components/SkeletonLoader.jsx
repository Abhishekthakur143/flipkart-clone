const ProductSkeleton = () => (
  <div className="bg-white p-2 rounded-[24px]">
    <div className="skeleton h-48 w-full mb-4 rounded-[17px]" />
    <div className="px-3 pb-3">
      <div className="skeleton h-4 w-3/4 mb-2" />
      <div className="skeleton h-4 w-1/2 mb-2" />
      <div className="skeleton h-6 w-1/3" />
    </div>
  </div>
);
 
const CardSkeleton = ({ count = 4 }) => (
  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
    {Array.from({ length: count }).map((_, i) => (
      <ProductSkeleton key={i} />
    ))}
  </div>
);
 
export { ProductSkeleton, CardSkeleton };
export default CardSkeleton;
 