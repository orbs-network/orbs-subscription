/**
 * Copyright 2019 the orbs-ethereum-contracts authors
 * This file is part of the orbs-ethereum-contracts library in the Orbs project.
 *
 * This source code is licensed under the MIT license found in the LICENSE file in the root directory of this source tree.
 * The above notice should be included in all copies or substantial portions of the software.
 */

const fs = require('fs');
const _ = require('lodash/core');

let verbose = false;
if (process.env.VERBOSE) {
    verbose = true;
}

function _recursiveFollowDelegation(originaDelegateAddress, potentialGuardianAddress, guardiansMap, delegatorsMap, level) {
    if (guardiansMap[potentialGuardianAddress]) { // got to guardian
        guardiansMap[potentialGuardianAddress].delegators.push(originaDelegateAddress);
        delegatorsMap[originaDelegateAddress].guardian = potentialGuardianAddress;
        delegatorsMap[originaDelegateAddress].guardianLevel = level;
        if (verbose) {
            console.log('\x1b[33m%s\x1b[0m', `delegator ${originaDelegateAddress} gave his voice to guardian ${potentialGuardianAddress} (${level === 0 ? 'directly' : `with ${level} intermediaries`})`);
        }
    } else if (delegatorsMap[potentialGuardianAddress]) { // delegate to delegate
        if (level >= 5) {
//            console.log(`d ${originaDelegateAddress} reached ${level} ignore`)
            return;
        }
//        console.log(`d ${originaDelegateAddress} gave to d ${potentialGuardianAddress} at level ${level} going forward to ${delegatorsMap[potentialGuardianAddress].address}`)
        _recursiveFollowDelegation(originaDelegateAddress, delegatorsMap[potentialGuardianAddress].delegateeAddress.toLowerCase(), guardiansMap, delegatorsMap, level+1);
    } else {
//        console.log(`d ${originaDelegateAddress} doesn't point to known address ignore`)
    }
}

function _calculateDelegationMap(guardiansMap, delegatorsMap) {
    if (verbose) {
        console.log('\x1b[33m%s\x1b[0m', `calculating delegation...`);
    }
    let delegators = _.values(delegatorsMap);
    for (let i = 0; i < delegators.length; i++) {
        let delegtor = delegators[i];
        let delegatorAddr = delegtor.address.toLowerCase();
        if (guardiansMap[delegatorAddr]) {
            if (verbose) {
                console.log('\x1b[33m%s\x1b[0m', `guardian ${delegatorAddr} self delegated, skipping`);
            }
            delete delegatorsMap[delegatorAddr];
        } else {
            _recursiveFollowDelegation(delegatorAddr, delegtor.delegateeAddress.toLowerCase(), guardiansMap, delegatorsMap, 0);
        }
    }
}

const ANNUAL_TO_ELECTION_FACTOR = 117.23;
const PARTICIPATION_ANNUAL_MAX = 60000000;
const PARTICIPATION_ANNUAL_PERCENT = 0.08;
const EXCELLENCE_ANNUAL_MAX = 40000000;
const EXCELLENCE_ANNUAL_PERCENT = 0.1;
function _maxRewardForGroup(upperMaximum, totalVotes, percent) {
    let upperMaximumPerElection = Math.trunc(upperMaximum / ANNUAL_TO_ELECTION_FACTOR);
    let calcMaximumPerElection = Math.trunc(totalVotes * percent / ANNUAL_TO_ELECTION_FACTOR);
    if (calcMaximumPerElection < upperMaximumPerElection) {
        if (verbose) {
            console.log('\x1b[33m%s\x1b[0m', `max reward is ${calcMaximumPerElection} which is ${percent} of total vote in annual terms`);
        }
        return calcMaximumPerElection;
    }
    if (verbose) {
        console.log('\x1b[33m%s\x1b[0m', `max reward is ${upperMaximumPerElection} which is ${upperMaximum} in annual terms`);
    }
    return upperMaximumPerElection;
}

function _copyAndSums(guardiansMap, delegatorsMap, results) {
    results.totalStake = 0;
    results.guardians = [];
    results.guardiansNonVote = [];
    results.nonDelegators = [];
    let guardians = _.values(guardiansMap);
    for (let i = 0; i < guardians.length; i++) {
        let guardian = guardians[i];
        let guardianStake = Math.trunc(guardian.stake);
        let voteWeight = guardianStake;
        let delegators = [];
        for (let j = 0; j < guardian.delegators.length; j++) {
            let delegator = delegatorsMap[guardian.delegators[j]];
            let delegatorStake = Math.trunc(delegator.stake);
            results.totalStake += delegatorStake;
            voteWeight += delegatorStake;
            delegators.push({address: delegator.address, selfStake: delegatorStake})
        }
        let resGuardian = {address: guardian.address, name: guardian.name, selfStake: guardianStake, voteWeight: voteWeight, delegators: delegators};
        if (guardian.voteBlock) {
            results.totalStake += guardianStake;
            resGuardian.voteBlock = guardian.voteBlock;
            resGuardian.vote = guardian.vote;
            results.guardians.push(resGuardian);
        } else {
            results.guardiansNonVote.push(resGuardian);
        }
    }
    let delegators = _.values(delegatorsMap);
    for (let i = 0; i < delegators.length; i++) {
        let delegator = delegators[i];
        if (!delegator.guardian) {
            results.nonDelegators.push({address: delegator.address, selfStake: Math.trunc(delegator.stake), delegatee: delegator.delegateeAddress });
        }
    }
}

function _updateAccReward(address, reward, rewardMap) {
    if (rewardMap[address]) {
        rewardMap[address] += reward;
    } else {
        rewardMap[address] = reward;
    }
    return rewardMap[address];

}

function _participationRewardCalculation(obj, maxTotal, maxParticipationReward, participatsRewards) {
    obj.percentStake = obj.selfStake * 100.0 / maxTotal;
    obj.reward = Math.trunc(obj.percentStake * maxParticipationReward / 100.0);
    obj.accReward = _updateAccReward(obj.address.toLowerCase(), obj.reward, participatsRewards);
}

function _voteRewardsCalculations(result, maxGuardianReward, guardiansRewards, maxParticipationReward, participatsRewards) {
    for (let i = 0; i < result.guardians.length;i++) {
        let guardian = result.guardians[i];
        if (i < EXCELLENCE_MAX) {
            let percent = guardian.voteWeight * 100.0 / result.totalExcellenceStake;
            guardian.excellenceReward = Math.trunc(percent * maxGuardianReward / 100.0);
            guardian.accExcellenceReward = _updateAccReward(guardian.address.toLowerCase(), guardian.excellenceReward, guardiansRewards);
        } else {
            guardian.excellenceReward = 0;
            guardian.accExcellenceReward = guardiansRewards[guardian.address.toLowerCase()];
            if(!guardian.accExcellenceReward) {
                guardian.accExcellenceReward = 0;
            }
        }

        _participationRewardCalculation(guardian, result.totalStake, maxParticipationReward, participatsRewards);

        for (let j = 0; j < guardian.delegators.length; j++) {
            _participationRewardCalculation(guardian.delegators[j], result.totalStake, maxParticipationReward, participatsRewards);
        }
    }
}
function _nonVoteFillOldRewards(result, guardiansRewards, participatsRewards) {
    for (let i = 0; i < result.guardiansNonVote.length;i++) {
        let guardian = result.guardians[i];
        guardian.accExcellenceReward = guardiansRewards[guardian.address.toLowerCase()];
        if(!guardian.accExcellenceReward) {
            guardian.accExcellenceReward = 0;
        }

        guardian.accReward = participatsRewards[guardian.address.toLowerCase()];
        if(!guardian.accReward) {
            guardian.accReward = 0;
        }

        for (let j = 0; j < guardian.delegators.length; j++) {
            let delegator = guardian.delegators[j];
            delegator.accReward = participatsRewards[delegator.address.toLowerCase()];
            if(!delegator.accReward) {
                delegator.accReward = 0;
            }
        }
    }
}

const EXCELLENCE_MAX = 10;
function calculate(guardiansMap, guardiansRewards, delegatorsMap, participantsRewards) {
    let result = {};
    _calculateDelegationMap(guardiansMap, delegatorsMap);
    _copyAndSums(guardiansMap, delegatorsMap, result);

    result.guardians.sort((a, b) => b.voteWeight - a.voteWeight);
    result.totalExcellenceStake = 0;
    for (let i = 0; i < EXCELLENCE_MAX && i < result.guardians.length;i++) {
        result.totalExcellenceStake += result.guardians[i].voteWeight;
    }

    if (verbose) {
        console.log('\x1b[33m%s\x1b[0m', `about to save voting information with ${result.totalStake} voting stake, of which ${result.totalExcellenceStake} is from ${EXCELLENCE_MAX} best guardians`);
    }

    let maxparticipantionReward = _maxRewardForGroup(PARTICIPATION_ANNUAL_MAX, result.totalStake, PARTICIPATION_ANNUAL_PERCENT);
    let maxGuardianReward = _maxRewardForGroup(EXCELLENCE_ANNUAL_MAX, result.totalExcellence, EXCELLENCE_ANNUAL_PERCENT);
    _voteRewardsCalculations(result, maxGuardianReward, guardiansRewards, maxparticipantionReward, participantsRewards);
    _nonVoteFillOldRewards(result, guardiansRewards, participantsRewards);

    return result;
}

function writeToFile(result, filenamePrefix, currentElectionBlock) {
    let totalReward = 0, totalAccReward = 0, totalGuardianReward = 0, totalGuardianAccReward = 0;
    let csvStr = `Voted@${currentElectionBlock}\nGuardian,Name,Delegator,Vote Stake,%of Total,Participation Reward,Accumulated Participation Reward,Vote Weight,% of Total,Excellence Reward,Accumulated Excellence Reward,Voted@Block,VoteOut1,VoteOut2,VoteOut3\n`;
    for (let i = 0; i < result.guardians.length; i++) {
        let guardian = result.guardians[i];
        csvStr += `${guardian.address},"${guardian.name}",,${guardian.selfStake},${guardian.percentStake}%,${guardian.reward},${guardian.accReward},`;
        let percent = guardian.voteWeight * 100.0 / result.totalStake;
        csvStr += `${guardian.voteWeight},${percent}%,${guardian.excellenceReward},${guardian.accExcellenceReward},@${guardian.voteBlock},`;
        if (guardian.vote.length > 0) {
            csvStr += `${guardian.vote[0]},`;
        }
        if (guardian.vote.length > 1) {
            csvStr += `${guardian.vote[1]},`;
        }
        if (guardian.vote.length > 2) {
            csvStr += `${guardian.vote[2]},`;
        }
        csvStr += `\n`;
        totalReward += guardian.reward;
        totalAccReward += guardian.accReward;
        totalGuardianReward += guardian.excellenceReward;
        totalGuardianAccReward += guardian.accExcellenceReward;

        for (let j = 0; j < guardian.delegators.length;j++) {
            let delegator = guardian.delegators[j];
            csvStr += `,,${delegator.address},${delegator.selfStake},${delegator.percentStake}%,${delegator.reward},${delegator.accReward}\n`;
            totalReward += delegator.reward;
            totalAccReward += delegator.accReward;
        }
    }
    csvStr += `Totals\n,,,${result.totalStake},100%,${totalReward},${totalAccReward},${result.totalStake},${totalGuardianReward},100%,${totalGuardianAccReward}\n`;
    csvStr += `\nNot Voted@${currentElectionBlock}\n`;

    for (let i = 0; i < result.guardiansNonVote.length; i++) {
        let guardian = result.guardiansNonVote[i];
        csvStr += `${guardian.address},"${guardian.name}",0,0%,0,${guardian.accReward},0,0%,0,${guardian.accExcellenceReward}\n`;
        for (let j = 0; j < guardian.delegators.length; j++) {
            let delegator = guardian.delegators[j];
            csvStr += `,,${delegator.address},0,0%,0,${delegator.accReward}\n`;
        }
    }

    csvStr += `\nBad Delegation\n`;
    for (let i = 0; i < result.nonDelegators.length; i++) {
        let delegator = result.nonDelegators[i];
        if (!delegator.guardian) {
            csvStr += `${delegator.delegatee},,${delegator.address},${delegator.selfStake},\n`;
        }
    }

    let path = `${filenamePrefix}_${currentElectionBlock}_votes.csv`;
    fs.writeFileSync(path, csvStr);
    console.log('\x1b[33m%s\x1b[0m', `CSV version file was saved to ${path}!\n`);
}

module.exports = {
    calculate,
    writeToFile,
};
