declare namespace Contracts {
    import TransactionDetails = Truffle.TransactionDetails;
    import TransactionResponse = Truffle.TransactionResponse;

    export interface MonthlySubscriptionContract extends Contract {
        createVC(payment: number|BN, params?: TransactionDetails): Promise<TransactionResponse>
        extendSubscription(vcid: number|BN, payment: number|BN, params?: TransactionDetails): Promise<TransactionResponse>
    }
}


