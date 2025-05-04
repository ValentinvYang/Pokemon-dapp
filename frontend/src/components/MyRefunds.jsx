import { useContext, useEffect, useState } from "react";
import { ContractContext } from "../contexts/AppContracts";
import RefundModal from "./RefundModal";
import { ethers } from "ethers";

export default function MyRefunds() {
  const { tradingContract, signer } = useContext(ContractContext);
  const [refund, setRefund] = useState(0n);
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [txSuccess, setTxSuccess] = useState(false);

  useEffect(() => {
    if (!signer || !tradingContract) return;

    const fetchRefund = async () => {
      try {
        const result = await tradingContract.pendingRefunds(signer.address);
        setRefund(result);
      } catch (err) {
        console.error("Failed to fetch refund:", err);
      }
    };

    fetchRefund();
  }, [signer, tradingContract, txSuccess]);

  //WITHDRAW REFUNDS FUNCTIONALITY
  const handleWithdraw = async () => {
    try {
      setLoading(true);

      const formattedRefund = ethers.formatEther(refund);
      const tx = await tradingContract.withdrawRefund();
      await tx.wait();

      setTxSuccess(true);
      setRefund(0n);
      alert(
        `✅ Refund withdrawn successfully! You received ${formattedRefund} ETH.`
      );
    } catch (err) {
      console.error("Withdraw failed:", err);
      alert("❌ Refund withdrawal failed.");
    } finally {
      setLoading(false);
      setModalOpen(false);
    }
  };

  return (
    <>
      <div className="flex items-center justify-center min-h-screen bg-gray-50 px-4 mt-20">
        <div className="flex items-stretch w-full max-w-6xl">
          {/* Left - Pikachu */}
          <div className="hidden md:block w-1/4">
            <img
              src="/Pikachu.png"
              alt="Pikachu"
              className="h-full w-full object-contain"
            />
          </div>

          {/* Middle - Refund Card */}
          <div className="bg-white shadow-lg rounded-xl p-6 w-full md:w-2/4 text-center space-y-6 mx-4 md:mx-6 lg:mx-8">
            <h1 className="text-2xl font-bold text-gray-800">💰 My Refunds</h1>

            <div className="text-sm text-gray-600 text-center space-y-4 font-semibold">
              <p>This page shows ETH you can withdraw:</p>

              {/* Auction Refunds Section */}
              <div className="flex flex-col md:flex-row md:items-start md:space-x-4">
                <span className="bg-orange-100 text-orange-800 font-semibold px-4 py-2 rounded-full text-sm text-center md:w-40 w-full">
                  Auction Refunds
                </span>
                <div className="bg-gray-100 text-gray-700 p-3 rounded-lg text-sm w-full mt-2 md:mt-0">
                  If someone outbids you in an auction, your previous bid is
                  stored safely here until you withdraw it.
                </div>
              </div>

              {/* Finalizer Rewards Section */}
              <div className="flex flex-col md:flex-row md:items-start md:space-x-4">
                <span className="bg-orange-100 text-orange-800 font-semibold px-4 py-2 rounded-full text-sm text-center md:w-40 w-full">
                  Finalizer Rewards
                </span>
                <div className="bg-gray-100 text-gray-700 p-3 rounded-lg text-sm w-full mt-2 md:mt-0">
                  When you finalize an auction, you’re rewarded with a small
                  fee. That fee is also collected here.
                </div>
              </div>
            </div>

            {refund > 0n ? (
              <>
                <p className="text-lg text-gray-700">
                  You have{" "}
                  <span className="font-semibold text-green-600">
                    {ethers.formatEther(refund)} ETH
                  </span>{" "}
                  available for withdrawal.
                </p>

                <button
                  onClick={() => setModalOpen(true)}
                  disabled={loading}
                  className="bg-green-500 hover:bg-green-600 text-white font-semibold px-6 py-3 rounded-lg w-full disabled:opacity-60"
                >
                  Withdraw Refund
                </button>
              </>
            ) : (
              <div className="bg-black text-white font-semibold px-6 py-3 rounded-lg w-full text-center">
                ⛔ You have no pending refunds.
              </div>
            )}
          </div>

          {/* Right - Charizard */}
          <div className="hidden md:block w-1/4">
            <img
              src="/Charizard.png"
              alt="Charizard"
              className="h-full w-full object-contain"
            />
          </div>
        </div>
      </div>
      <RefundModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onConfirm={handleWithdraw}
        refund={refund}
        loading={loading}
      />
    </>
  );
}
