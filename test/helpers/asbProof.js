import Bytes from './bytes';

class ASBProof {
  // Builds the Results Block Header according to:
  // +---------------------+--------+------+----------------------+
  // |        Field        | Offset | Size |       Encoding       |
  // +---------------------+--------+------+----------------------+
  // | protocol_version    |      0 |    4 | uint32               |
  // | virtual_chain_id    |      4 |    8 | uint64               |
  // | network_type        |     12 |    4 | enum (4 bytes)       |
  // | timestamp           |     16 |    8 | uint64 unix 64b time |
  // | receipt_merkle_root |     64 |   32 | bytes (32B)          |
  // +---------------------+--------+------+----------------------+
  static buildResultsBlockHeader(resultsBlockHeader) {
    return Buffer.concat([
      Bytes.numberToBuffer(resultsBlockHeader.protocolVersion, 4),
      Bytes.numberToBuffer(resultsBlockHeader.virtualChainId, 8),
      Bytes.numberToBuffer(resultsBlockHeader.networkType, 4),
      Bytes.numberToBuffer(resultsBlockHeader.timestamp, 8),
      Buffer.alloc(40),
      resultsBlockHeader.receiptMerkleRoot,
    ]);
  }
  // Builds the Autonomous Swap Event Data according to:
  // +----------------------+--------+------+------------+
  // |        Field         | Offset | Size |  Encoding  |
  // +----------------------+--------+------+------------+
  // | contract name length | 0      | 4    | uint32     |
  // | contract name        | 4      | N    | string     |
  // | event_id             | TBD    | 4    | uint32     |
  // | tuid                 | TBD    | 8    | uint64     |
  // | ethereum_address     | TBD    | 20   | bytes(20B) |
  // | tokens               | TBD    | 32   | bytes(32B) |
  // +----------------------+--------+------+------------+
  static buildEventData(event) {
    return Buffer.concat([
      Bytes.numberToBuffer(event.orbsContractName.length, 4),
      Buffer.from(event.orbsContractName),
      Bytes.numberToBuffer(event.eventId, 4),
      Bytes.numberToBuffer(event.tuid, 8),
      Bytes.addressToBuffer(event.ethereumAddress),
      Bytes.numberToBuffer(event.value, 32),
    ]);
  }
}

class ASBProofBuilder {
  constructor(token, federation, verifier) {
    this.token = token;
    this.federation = federation;
    this.verifier = verifier;
  }
}

module.exports = { ASBProof, ASBProofBuilder };
