declare namespace Contracts {
    import TransactionResponse = Truffle.TransactionResponse;
    import TransactionDetails = Truffle.TransactionDetails;

    export interface RewardsContract extends Contract {
        getLastPayedAt(): Promise<string>
        getOrbsBalance(address: string) : Promise<string>;
        getExternalTokenBalance(address: string) : Promise<string>
        assignRewards(params?: TransactionDetails): Promise<TransactionResponse>;
        distributeOrbsTokenRewards(addrs: string[], amounts: (number|BN)[], params?: TransactionDetails): Promise<TransactionResponse>;
        setFixedPoolMonthlyRate(rate: number|BN, params?: TransactionDetails): Promise<TransactionResponse>;
        setProRataPoolMonthlyRate(rate: number|BN, params?: TransactionDetails): Promise<TransactionResponse>;
        topUpFixedPool(amount: number|BN, params?: TransactionDetails): Promise<TransactionResponse>;
        topUpProRataPool(amount: number|BN, params?: TransactionDetails): Promise<TransactionResponse>;
        claimExternalTokenRewards(params?: TransactionDetails): Promise<TransactionResponse>;
    }
}


