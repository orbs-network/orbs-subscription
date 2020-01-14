import Web3PromiEvent from 'web3-core-promievent';
import { PromiEvent, TransactionReceipt } from 'web3-core';
import { TxsMocker } from '../testkit/TxsMocker';
import Mock = jest.Mock;

type TActionNames = 'ActionA' | 'ActionB';

describe('TxCreatingServiceMock', () => {
  let txCreatingServiceMockBase: TxsMocker<TActionNames>;

  beforeEach(() => {
    txCreatingServiceMockBase = new TxsMocker(true);
  });

  describe('Construction', () => {
    it('Should assign "autoCompleteTxes" value properly', () => {
      const txMockerAutoCompletingTxes = new TxsMocker(true);
      const txMockerNotAutoCompletingTxes = new TxsMocker(false);

      expect(txMockerAutoCompletingTxes.isAutoCompletingTxes).toBe(true);
      expect(txMockerNotAutoCompletingTxes.isAutoCompletingTxes).toBe(false);
    });
  });

  describe('Event Emitting', () => {
    let handler1: Mock;
    let handler2: Mock;
    let handler3: Mock;
    let handler4: Mock;

    beforeEach(() => {
      handler1 = jest.fn();
      handler2 = jest.fn();
      handler3 = jest.fn();
      handler4 = jest.fn();
    });

    it('Should allow for multiple isolated "register" and "registerOnce"', () => {
      txCreatingServiceMockBase.registerToTxCreation('ActionA', handler1);
      txCreatingServiceMockBase.registerToNextTxCreation('ActionA', handler2);
      txCreatingServiceMockBase.registerToTxCreation('ActionB', handler3);

      // Trigger both events for the first time
      const promiventA1 = Web3PromiEvent();
      const promiventB1 = Web3PromiEvent();
      txCreatingServiceMockBase.emmitTxCreated('ActionA', promiventA1);
      txCreatingServiceMockBase.emmitTxCreated('ActionB', promiventB1);

      expect(handler1).toBeCalledTimes(1);
      expect(handler1).toBeCalledWith(promiventA1);

      expect(handler2).toBeCalledTimes(1);
      expect(handler2).toBeCalledWith(promiventA1);

      expect(handler3).toBeCalledTimes(1);
      expect(handler3).toBeCalledWith(promiventB1);

      // Trigger both events for the second time
      const promiventA2 = Web3PromiEvent();
      const promiventB2 = Web3PromiEvent();
      txCreatingServiceMockBase.emmitTxCreated('ActionA', promiventA2);
      txCreatingServiceMockBase.emmitTxCreated('ActionB', promiventB2);

      expect(handler1).toBeCalledTimes(2);
      expect(handler1).toBeCalledWith(promiventA2);

      expect(handler2).toBeCalledTimes(1);
      expect(handler2).not.toBeCalledWith(promiventA2); // Once

      expect(handler3).toBeCalledTimes(2);
      expect(handler3).toBeCalledWith(promiventB2);
    });

    it('Should allow to unregister a single handler', () => {
      txCreatingServiceMockBase.registerToTxCreation('ActionA', handler1);
      txCreatingServiceMockBase.registerToNextTxCreation('ActionA', handler2);
      txCreatingServiceMockBase.registerToTxCreation('ActionB', handler3);
      txCreatingServiceMockBase.registerToTxCreation('ActionB', handler4);

      const promiventA1 = Web3PromiEvent();
      const promiventB1 = Web3PromiEvent();

      // Remove only one of the listeners
      txCreatingServiceMockBase.unregisterToTxCreation('ActionA', handler2);

      // Trigger events
      txCreatingServiceMockBase.emmitTxCreated('ActionA', promiventA1);
      txCreatingServiceMockBase.emmitTxCreated('ActionB', promiventB1);

      // Ensure all were called but the removed listener
      expect(handler1).toBeCalledTimes(1);
      expect(handler2).toBeCalledTimes(0);
      expect(handler3).toBeCalledTimes(1);
      expect(handler4).toBeCalledTimes(1);

      expect(handler1).toBeCalledWith(promiventA1);
      expect(handler2).not.toBeCalledWith(promiventA1);
      expect(handler3).toBeCalledWith(promiventB1);
      expect(handler4).toBeCalledWith(promiventB1);
    });

    it('Should allow to unregister all handlers of a specific action', () => {
      txCreatingServiceMockBase.registerToTxCreation('ActionA', handler1);
      txCreatingServiceMockBase.registerToNextTxCreation('ActionA', handler2);
      txCreatingServiceMockBase.registerToTxCreation('ActionB', handler3);
      txCreatingServiceMockBase.registerToTxCreation('ActionB', handler4);

      const promiventA1 = Web3PromiEvent();
      const promiventB1 = Web3PromiEvent();

      // Remove only one of the listeners
      txCreatingServiceMockBase.removeAllTxCreationListeners('ActionA');

      // Trigger events
      txCreatingServiceMockBase.emmitTxCreated('ActionA', promiventA1);
      txCreatingServiceMockBase.emmitTxCreated('ActionB', promiventB1);

      // Ensure all were called but the removed listener
      expect(handler1).toBeCalledTimes(0);
      expect(handler2).toBeCalledTimes(0);
      expect(handler3).toBeCalledTimes(1);
      expect(handler4).toBeCalledTimes(1);

      expect(handler1).not.toBeCalledWith(promiventA1);
      expect(handler2).not.toBeCalledWith(promiventA1);
      expect(handler3).toBeCalledWith(promiventB1);
      expect(handler4).toBeCalledWith(promiventB1);
    });

    it('Should allow to unregister all handlers of all actions at once', () => {
      txCreatingServiceMockBase.registerToTxCreation('ActionA', handler1);
      txCreatingServiceMockBase.registerToNextTxCreation('ActionA', handler2);
      txCreatingServiceMockBase.registerToTxCreation('ActionB', handler3);
      txCreatingServiceMockBase.registerToTxCreation('ActionB', handler4);

      const promiventA1 = Web3PromiEvent();
      const promiventB1 = Web3PromiEvent();

      // Remove only one of the listeners
      txCreatingServiceMockBase.removeAllTxCreationListeners();

      // Trigger events
      txCreatingServiceMockBase.emmitTxCreated('ActionA', promiventA1);
      txCreatingServiceMockBase.emmitTxCreated('ActionB', promiventB1);

      // Ensure all were called but the removed listener
      expect(handler1).toBeCalledTimes(0);
      expect(handler2).toBeCalledTimes(0);
      expect(handler3).toBeCalledTimes(0);
      expect(handler4).toBeCalledTimes(0);

      expect(handler1).not.toBeCalledWith(promiventA1);
      expect(handler2).not.toBeCalledWith(promiventA1);
      expect(handler3).not.toBeCalledWith(promiventB1);
      expect(handler4).not.toBeCalledWith(promiventB1);
    });
  });
});