import { ethers } from "ethers";

export default function RefundModal({
  isOpen,
  onClose,
  onConfirm,
  refund,
  loading,
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md space-y-4">
        <h2 className="text-xl font-semibold text-gray-800">Withdraw Refund</h2>
        <p className="text-gray-600">
          You are about to withdraw{" "}
          <span className="font-semibold text-green-600">
            {ethers.formatEther(refund)} ETH
          </span>
          . This will transfer the amount to your wallet.
        </p>
        <div className="flex justify-end space-x-3 pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white font-semibold rounded disabled:opacity-60"
          >
            {loading ? "Withdrawing..." : "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}
