export const PokerRanks = {
    HIGH_CARD: 1,
    PAIR: 2,
    TWO_PAIR: 3,
    THREE_OF_A_KIND: 4,
    STRAIGHT: 5,
    FLUSH: 6,
    FULL_HOUSE: 7,
    FOUR_OF_A_KIND: 8,
    STRAIGHT_FLUSH: 9,
    ROYAL_FLUSH: 10
};

const CardValue = {
    '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
    'J': 11, 'Q': 12, 'K': 13, 'A': 14
};

function getCombinations(array, size) {
    const result = [];
    const f = function(prefix, array) {
        for (let i = 0; i < array.length; i++) {
            const nextPrefix = [...prefix, array[i]];
            if (nextPrefix.length === size) {
                result.push(nextPrefix);
            } else {
                f(nextPrefix, array.slice(i + 1));
            }
        }
    };
    f([], array);
    return result;
}

function evaluate5Cards(cards) {
    // Sort descending by value
    const sorted = [...cards].sort((a, b) => CardValue[b.rank] - CardValue[a.rank]);
    
    const isFlush = sorted.every(c => c.suit === sorted[0].suit);
    let isStraight = false;
    
    // Check straight
    if (sorted[0].rank === 'A' && sorted[1].rank === '5' && sorted[2].rank === '4' && sorted[3].rank === '3' && sorted[4].rank === '2') {
        // A-2-3-4-5 straight
        isStraight = true;
        // Reorder for value calc
        const ace = sorted.shift();
        sorted.push(ace); 
    } else {
        isStraight = true;
        for (let i = 0; i < 4; i++) {
            if (CardValue[sorted[i].rank] - 1 !== CardValue[sorted[i+1].rank]) {
                isStraight = false;
                break;
            }
        }
    }

    const counts = {};
    sorted.forEach(c => {
        counts[c.rank] = (counts[c.rank] || 0) + 1;
    });
    
    const frequencies = Object.entries(counts).map(([rank, count]) => ({ rank, count }))
        .sort((a, b) => {
            if (a.count !== b.count) return b.count - a.count;
            return CardValue[b.rank] - CardValue[a.rank];
        });

    let rankScore = PokerRanks.HIGH_CARD;
    let rankName = "High Card";

    if (isStraight && isFlush) {
        if (sorted[0].rank === 'A' && sorted[1].rank === 'K') {
            rankScore = PokerRanks.ROYAL_FLUSH;
            rankName = "Royal Flush";
        } else {
            rankScore = PokerRanks.STRAIGHT_FLUSH;
            rankName = "Straight Flush";
        }
    } else if (frequencies[0].count === 4) {
        rankScore = PokerRanks.FOUR_OF_A_KIND;
        rankName = "Four of a Kind";
    } else if (frequencies[0].count === 3 && frequencies[1].count === 2) {
        rankScore = PokerRanks.FULL_HOUSE;
        rankName = "Full House";
    } else if (isFlush) {
        rankScore = PokerRanks.FLUSH;
        rankName = "Flush";
    } else if (isStraight) {
        rankScore = PokerRanks.STRAIGHT;
        rankName = "Straight";
    } else if (frequencies[0].count === 3) {
        rankScore = PokerRanks.THREE_OF_A_KIND;
        rankName = "Three of a Kind";
    } else if (frequencies[0].count === 2 && frequencies[1].count === 2) {
        rankScore = PokerRanks.TWO_PAIR;
        rankName = "Two Pair";
    } else if (frequencies[0].count === 2) {
        rankScore = PokerRanks.PAIR;
        rankName = "Pair";
    }

    // Tie-breaker value:
    // We can represent the hand value as a hex string or large integer
    // e.g. Rank followed by the cards in order of significance
    let tieBreaker = rankScore.toString(16).padStart(2, '0');
    frequencies.forEach(f => {
        for(let i=0; i<f.count; i++) {
            tieBreaker += CardValue[f.rank].toString(16).padStart(2, '0');
        }
    });

    return { rankScore, rankName, tieBreaker, cards: sorted };
}

export function evaluatePokerHand(holeCards, communityCards) {
    if (!holeCards || holeCards.length !== 2) return null;
    const allCards = [...holeCards, ...(communityCards || [])];
    
    if (allCards.length < 5) return null;

    const combos = getCombinations(allCards, 5);
    let bestHand = null;

    combos.forEach(combo => {
        const evalHand = evaluate5Cards(combo);
        if (!bestHand || evalHand.tieBreaker > bestHand.tieBreaker) {
            bestHand = evalHand;
        }
    });

    // Logging/prediction helper
    // console.log(`Prediction for [${holeCards.map(c => c.rank+c.suit).join(', ')}] + [${communityCards.map(c=>c.rank+c.suit).join(', ')}]: ${bestHand.rankName}`);
    return bestHand;
}
