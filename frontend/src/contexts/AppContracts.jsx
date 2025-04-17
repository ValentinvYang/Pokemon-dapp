import { createContext, useContext } from "react";

export const ContractContext = createContext(null);
export const useContracts = () => useContext(ContractContext);
