//2.0
var SteamUser = require('steam-user');
var SteamCommunity = require('steamcommunity');
var SteamTotp = require('steam-totp');
var TradeOfferManager = require('steam-tradeoffer-manager');
var fs = require('fs');
var async = require('async');
var backpack = require('./backpack.js');

var autoprice = require('./autoprice.js');
var client = new SteamUser();

var request = require('request');


if (fs.existsSync('config.json')) {
    config = JSON.parse(fs.readFileSync('config.json'));
}

var logOnOptions = {
    "rememberPassword": true, //so we can relog
    "accountName": config.username,
    "password": config.password,
    "twoFactorCode": SteamTotp.getAuthCode(config.shared_secret)
};

keyvalue_bot = 36.77;
DEBUG1 = 1; //these are are shorthand to toggle log settings easily, debug2 has more detailed info
DEBUG2 = 0;
var writingJSON = 0;

var acceptedTrades = 0;
var tradesToday = 0;
var receivedTrades = 0;
var receivedTradesToday = 0;
var profit = 0;
var profitToday = 0;


var manager = new TradeOfferManager({
    "steam": client,
    "pollInterval": 12000,
    "domain": "example.com",
    "language": "en", // english item descriptions
    "dataDirectory": null
});

var community = new SteamCommunity();

if (fs.existsSync('polldata.json')) {
    manager.pollData = JSON.parse(fs.readFileSync('polldata.json'));
}

if (fs.existsSync('listings.json')) {
    listings = JSON.parse(fs.readFileSync('listings.json'));
}


if (fs.existsSync('tradecount.json')) {
    var tradecount = JSON.parse(fs.readFileSync('tradecount.json'));
    acceptedTrades = tradecount.acceptedTrades;
    tradesToday = tradecount.tradesToday;
    receivedTrades = tradecount.receivedTrades;
    receivedTradesToday = tradecount.receivedTradesToday;
    keyvalue_bot = tradecount.keyvalue_bot;
    profit = tradecount.profit;
    profitToday = tradecount.profitToday;
    update = tradecount.update;
}

client.logOn(logOnOptions);

client.on('loggedOn', function() {
    DEBUG1 && console.info("Logged into Steam");
});

client.on('webSession', function(sessionID, cookies) {
    client.setPersona(1);
    client.gamesPlayed(["Trading Tf2 Items 24/7", 440]);
    manager.setCookies(cookies, function(err) {
        if (err) {
            DEBUG1 && console.log(err);
            setTimeout(function() {
                process.exit(1);
            }, 5000); // Fatal error since we couldn't get our API key
            return;
        }

        DEBUG1 && console.log("Got API key: " + manager.apiKey);
    });
    community.setCookies(cookies);
    community.startConfirmationChecker(30000, config.identity_secret); // autocheck confirmations (we explicitly check later)
});

function istf2(item) {
    if (item.appid === 440) {
        return true;
    } else {
        return false;
    }
}

function checkAllTf2(myItems, theirItems, callback) { //ignore any non-tf2 trades
    function arraycheckTf2(zarray) {
        for (b = 0; b < zarray.length; b++) {
            if (istf2(zarray[b]) === false) {
                return false;
            }
        }
        return true;
    }
    if (arraycheckTf2(theirItems) === true && arraycheckTf2(myItems) === true) {
        return callback(null);
    } else {
        return callback(9);
    }
}

function isUncraft(item) {
    if (JSON.stringify(item.descriptions).includes("Not Usable in Crafting")) {
        //DEBUG1 && console.log("uncraft");
        return true;
    } else {
        return false;
    }
}

function killstreakTier(item) {
    if (!(item.market_hash_name.includes("Killstreak"))) {
        return 0;
    } else if (item.market_hash_name.includes("Professional Killstreak")) {
        return 3;
    } else if (item.market_hash_name.includes("Specialized Killstreak")) {
        return 2;
    } else if (item.market_hash_name.includes("Killstreak")) {
        return 1;
    }
}

function def_index(item) { //We do this by taking the wiki link. This is much more reliable than going through app_data, which is often unavailable
    return Number(JSON.stringify(item.actions).replace(/^.+wiki.teamfortress.com\/scripts\/itemredirect.php\?id=/, '').replace(/&.*/, ""))
}

function quality(item) {
    var itags = JSON.stringify(item.tags);
    if (itags.includes('Exterior')) {
        return 20; //reject decorated weapons because can have same defindex as normal items
    }
    if (itags.includes('Strange') && itags.includes('Strange Part') === false) {
        return 11;
    }
    if (itags.includes('Unique')) {
        return 6;
    }
    if (itags.includes('Genuine')) {
        return 1;
    }
    if (itags.includes('Vintage')) {
        return 3;
    }
    if (itags.includes('Haunted')) {
        return 13;
    } else {
        return 20; //we don't know the quality, but this will guarantee it does not match our listings
    }
}

function australium(item) {
    if (item.market_hash_name.includes("Australium")) {
        return true;
    } else {
        return false;
    }
}

function isMetal(item) {
    if (item.market_hash_name === "Refined Metal") { //all math done with metal is*9 to prevent any roundoff errors.
        return 9;
    } else if (item.market_hash_name === "Reclaimed Metal") {
        return 3;
    } else if (item.market_hash_name === "Scrap Metal") {
        return 1;
    } else {
        return false;
    }
}

function isKey(item) {
    if (item.market_hash_name === "Mann Co. Supply Crate Key") {
        return 1;
    } else {
        return false;
    }
}

function declineOffer(offer, declineReason) {
    console.log("offer #" + offer.id + " ignored for reason " + declineReason);
    /*
    offer.decline(function (err){
        if (err) {
            DEBUG1 && console.log("Unable to decline offer: " + err.message);
        }
        else {
            DEBUG1 && console.log("offer #"+offer.id+" declined for reason " + declineReason);
        }
    });
	*/
    //You see this here. This is what got me banned. Don't enable declines.
}

function checkEscrow(offer, callback) {
    DEBUG1 && console.log("checking escrow");
    var escrowTries = 0; //oftentimes steam gives errors for this, which are a pain in the ass.
    function doEscrowcheck() {
        offer.getUserDetails(function(err, me, them) {
            if (!err) {
                if (them.escrowDays > 0) {
                    DEBUG1 && console.log("escrow");
                    DEBUG1 && console.log(them.personaName);
                    DEBUG1 && console.log(them.escrowDays);
                    return callback(4);
                } else if (them.escrowDays === 0) {
                    DEBUG1 && console.log("no escrow");
                    DEBUG1 && console.log(them.personaName);
                    DEBUG1 && console.log(them.escrowDays);
                    return callback(null);
                }
            } else {
                console.warn("error getting escrow days, retrying in 8s");
                if (escrowTries < 50) {
                    escrowTries += 1;
                    setTimeout(function() {
                        setImmediate(function() {
                            doEscrowcheck();
                        });
                    }, 8000);
                } else {
                    //client.relog();    //Originally I process.exit() and restarted daemons here. Possible to do, but can cause issues with saving files sometimes.
                    setTimeout(function() {
                        setImmediate(function() {
                            doEscrowcheck();
                        });
                    }, 8000);
                }
            }
        });
    }
    doEscrowcheck();
}

function onlyTaking(myItems, theirItems, callback) {
    DEBUG1 && console.log("checking onlyTaking");
    if (myItems.length > 0 && theirItems.length === 0) {
        return callback(5);
    } else {
        return callback(null);
    }
}

function donation(myItems, theirItems, callback) { //accept one sided offers, because fuck you.
    DEBUG1 && console.log("checking donation");
    if (myItems.length === 0 && theirItems.length > 0) {
        DEBUG1 && console.log("is donation");
        return callback(1);
    } else {
        DEBUG1 && console.log("not donation");
        return callback(null);
    }
}

function acceptOffer(offer) {
    var acceptoffercount = 1;

    function doAccept() {
        offer.accept(function(err) {
            if (err) {
                DEBUG1 && console.log("Unable to accept offer: " + err.message);
                if (acceptoffercount < 20) {
                    acceptoffercount += 1;
                    setTimeout(function() {
                        setImmediate(function() {
                            doAccept();
                        });
                    }, 8000);
                    return;
                } else {
                    DEBUG1 && console.log("too many errors on steam so ignoring");
                    setTimeout(function() {
                        setImmediate(function() {
                            acceptOffer(offer);
                        });
                    }, 60000);
                    //declineOffer(offer, "steam_error_accepting");
                }
            } else {
                community.checkConfirmations(); // Check for confirmations right after accepting the offer
                DEBUG1 && console.log("Offer accepted");
                return;
            }
        });
    }
    doAccept();
}

function onlyCurrency(myItems, theirItems, callback) {
    DEBUG1 && console.log("checking onlyCurrency");

    function checkOnlyCurrency(array) {
        for (i = 0; i < array.length; i++) {
            if (isKey(array[i]) === false && isMetal(array[i]) === false) {
                DEBUG1 && console.log("break");
                return false;
            } else if (i === (array.length - 1)) {
                DEBUG1 && console.log("all currency");
                return true;
            }
        }
    }
    if (checkOnlyCurrency(myItems) === true && checkOnlyCurrency(theirItems) === true) {
        DEBUG1 && console.log("only currency true");
        return callback(6);
    } else {
        DEBUG1 && console.log("only currency false");
        return callback(null);
    }
}

function indexItem(item, callback) {
    if (!(item.actions)) {
        return callback(11); //actions are missing so we don't know defindex
    }
    var indexMatches = [];
    var itemdefindex = def_index(item);
    var iquality = quality(item);
    var iuncraft = isUncraft(item);
    var iaustralium = australium(item);
    var ikillstreak = killstreakTier(item);
    for (i = 0; i < listings.length; i++) {
        if (listings[i].def_index === itemdefindex && listings[i].maxstock !== 0) {
            indexMatches.push(i);
        }
    }
    if (indexMatches.length === 0) {
        console.log("no defindex matches");
        return callback(9); //item invalid b/c no defindex matches.
    } else {
        for (i = 0; i < indexMatches.length; i++) {
            var bank = listings[indexMatches[i]];
            //DEBUG1 && console.log(bank);
            //DEBUG1 && console.log(indexMatches);
            if (iquality === bank.quality && iuncraft === bank.uncraft && iaustralium === bank.australium && (ikillstreak === bank.killstreak || bank.killstreak === 0 || (bank.killstreak === -1 && ikillstreak === 0))) {
                console.log("indexmatch", indexMatches[i]);
                if (bank.inventory.length < bank.maxstock) {
                    return indexMatches[i];
                } else {
                    console.log("indexmatch is at maxstock so skipping"); //This is for cases when an item can match multiple filters, i.e. any killstreak + the killstreak version.
                }
            } else if (i === indexMatches.length - 1) {
                console.log("no full matches");
                return callback(9); //there were index matches but no actual matches-> we ignore trade
            }
        }
    }
}

function indexItemById(assetid, callback) {
    for (tk = 0; tk < listings.length; tk++) {
        if (listings[tk].inventory.includes(assetid)) {
            return tk;
        } else if (tk === listings.length - 1) {
            console.log("unknown item my side");
            return callback(9); //I don't know what item was on my side
        }
    }
}

function checkItems(myItems, theirItems, keyvalue_bot, mainCallback) {
    function refOverflow_keyc(x) {
        return Math.floor(x / keyvalue_bot);
    }

    function refOverflow_refc(u) {
        return Math.trunc((Math.round(Number((u - (Math.floor(u / keyvalue_bot) * keyvalue_bot)).toFixed(2)) * 9) / 9) * 100) / 100;
    }
    var theirKeys = 0;
    var theirMetal = 0; //remember this is multiplied by 9
    var theirIndexes = [];

    var myKeys = 0;
    var myMetal = 0;
    var continueCheck = 1;
    for (j = 0; j < theirItems.length; j++) {
        //DEBUG1 && console.log(j);
        var ck = theirItems[j];
        if (isKey(ck) === false && isMetal(ck) === false) { //non-currencies
            var index = indexItem(ck, mainCallback);
            DEBUG1 && console.log("index", index);
            if (index == null) {
                continueCheck = 0;
                break;
            } else {
                theirIndexes.push(index);
                theirKeys += listings[index].buyprice.keys;
                theirMetal += Math.round((listings[index].buyprice.ref) * 9);
            }
        } else { //don't check listings.json for currencies
            if (isKey(ck)) {
                theirKeys += 1;
            } else if (isMetal(ck)) {
                theirMetal += isMetal(ck);
            }
        }
    }
    if (continueCheck === 1) {
        function instanceCount(arr) {
            var a = [],
                b = [],
                prev;

            arr.sort(); //This is not elegant, but it works. We want to be able to count multiple items of the same type in one trade.
            for (var s = 0; s < arr.length; s++) {
                if (arr[s] !== prev) {
                    a.push(arr[s]);
                    b.push(1);
                } else {
                    b[b.length - 1]++;
                }
                prev = arr[s];
            }

            return [a, b];
        }
        var indexcount = instanceCount(theirIndexes); //indexcount[0]=their indexed items in order, indexcount[1]=# of instances
        for (l = 0; l < indexcount[0].length; l++) {
            var itemIndexQ = indexcount[0][l];
            var currentItemCount = listings[itemIndexQ].inventory.length;
            var maxItem = listings[itemIndexQ].maxstock;
            var theirCount = indexcount[1][l];
            DEBUG1 && console.log("maxItemCount", maxItem);
            DEBUG1 && console.log("currentItemCount", currentItemCount);
            DEBUG1 && console.log("theirCount", theirCount);
            if (theirCount + currentItemCount > maxItem) {
                return mainCallback(8);
            }
        }
        for (jk = 0; jk < myItems.length; jk++) {
            var dp = myItems[jk];
            if (isKey(dp) === false && isMetal(dp) === false) { //non-currencies
                DEBUG1 && console.log("searching for asset " + dp.assetid);
                var index = indexItemById(Number(dp.assetid), mainCallback);
                DEBUG1 && console.log("index", index);
                if (index == null) {
                    continueCheck = 0;
                    break;
                } else {
                    myKeys += listings[index].sellprice.keys;
                    myMetal += Math.round((listings[index].sellprice.ref) * 9);
                }
            } else { //don't check listings.json for currencies
                if (isKey(dp)) {
                    myKeys += 1;
                } else if (isMetal(dp)) {
                    myMetal += isMetal(dp);
                }
            }
        }
        if (continueCheck === 1) {
            var keyvalueTimesNine = Math.round(keyvalue_bot * 9);
            var myTotalValue = (keyvalueTimesNine * myKeys) + myMetal;
            var TheirTotalValue = (keyvalueTimesNine * theirKeys) + theirMetal;
            theirMetal = Math.trunc((theirMetal / 9) * 100) / 100;
            myMetal = Math.trunc((myMetal / 9) * 100) / 100;
            if (theirMetal >= keyvalue_bot) {
                theirKeys += refOverflow_keyc(theirMetal);
                theirMetal = refOverflow_refc(theirMetal);
            }
            if (myMetal >= keyvalue_bot) {
                myKeys += refOverflow_keyc(myMetal);
                myMetal = refOverflow_refc(myMetal);
            }
            DEBUG1 && console.log("theirKeys: " + theirKeys + " theirMetal: " + theirMetal);
            DEBUG1 && console.log("myKeys: " + myKeys + " myMetal: " + myMetal);
            DEBUG1 && console.log("myTotalValue: " + myTotalValue / 9 + " TheirTotalValue: " + TheirTotalValue / 9);
            if (myKeys >= 50 || theirKeys >= 50) {
                console.log("protection, not allowing trades > 50 keys");
                return mainCallback(8);
            } else if ((myTotalValue / 9) >= (50 * keyvalue_bot) || (TheirTotalValue / 9) >= (50 * keyvalue_bot)) {
                console.log("protection, not allowing trades > 50 keys");
                return mainCallback(8);
            } else if (TheirTotalValue >= myTotalValue) {
                return mainCallback(12);
            } else {
                return mainCallback(10);
            }
        }
    }
}

function checkAdmin(theirId, callback) {
    if (theirId == config.admin) {
        console.warn("admin");
        return callback(2);
    } else {
        DEBUG1 && console.log("not admin");
        return callback(null);
    }
}
manager.on('newOffer', handleNewOffer);

function handleNewOffer(offer) {
    receivedTrades += 1;
    receivedTradesToday += 1;
    DEBUG1 && console.log("New offer #" + offer.id + " from " + offer.partner.getSteam3RenderedID());
    var declineReason = "";
    var partnerID = (offer.partner.getSteamID64());
    var theirItems = offer.itemsToReceive;
    var myItems = offer.itemsToGive;
    async.waterfall([
        async.apply(checkAdmin, partnerID),
        async.apply(checkEscrow, offer),
        async.apply(backpack.checkBanned, partnerID),
        async.apply(onlyTaking, myItems, theirItems),
        async.apply(donation, myItems, theirItems),
        async.apply(checkAllTf2, myItems, theirItems),
        async.apply(onlyCurrency, myItems, theirItems),
        async.apply(checkItems, myItems, theirItems, keyvalue_bot)
    ], function(error) {
        DEBUG1 && console.log("end");
        DEBUG1 && console.log(error);
        if (error >= 1) {
            error = error - 1;
            var errorcodes = ["donation", "admin", "bp.tf_banned", "escrow", "only_taking", "only_currency", "currency_conversion", "maxstock", "invalid_items", "invalid_value", "actions missing", "passed_all_checks"];
            DEBUG1 && console.log(errorcodes[error]);
            if (error > 0 && error !== 1 && error !== 11 && error !== 10) {
                declineOffer(offer, errorcodes[error]);
                return;
            } else if (error == 0 || error == 1 || error == 11) {
                DEBUG1 && console.log("accepting offer for reason " + errorcodes[error]);
                acceptOffer(offer);
                return;
            } else if (error == 10) {
                console.error("Missing actions, retrying in 8s");
                setTimeout(function() {
                    setImmediate(function() {
                        handleNewOffer(offer);
                    });
                }, 8000);
            }
        }
    });
}

manager.on('receivedOfferChanged', handleAccepted);


function compareArrays(arr1, arr2) {
    arr1 = arr1.sort(); //we need to sort the arrays because we don't care about order
    arr2 = arr2.sort();
    if (arr1.length == arr2.length && arr1.every(function(u, ikl) {
            return u === arr2[ikl];
        })) {
        return true;
    } else {
        return false;
    }

}

function indexItemBPSORT(item) {
    var indexMatches = [];
    var itemdefindex = def_index(item);
    var iquality = quality(item);
    var iuncraft = isUncraft(item);
    var iaustralium = australium(item);
    var ikillstreak = killstreakTier(item);
    for (i = 0; i < listings.length; i++) {
        if (listings[i].def_index === itemdefindex) {
            indexMatches.push(i);
        }
    }
    if (indexMatches.length === 0) {
        return false; //item invalid b/c no defindex matches
    } else {
        for (i = 0; i < indexMatches.length; i++) {
            var bank = listings[indexMatches[i]];
            if (iquality === bank.quality && iuncraft === bank.uncraft && iaustralium === bank.australium && (ikillstreak === bank.killstreak || bank.killstreak === 0 || (bank.killstreak === -1 && ikillstreak === 0))) {
                return indexMatches[i];
            } else if (i === indexMatches.length - 1) {
                return false; //there were index matches but no actual matches
            }
        }
    }
}

function handleAccepted(offer, oldState) {
    DEBUG1 && console.log(`Offer #${offer.id} changed: ${TradeOfferManager.ETradeOfferState[oldState]} -> ${TradeOfferManager.ETradeOfferState[offer.state]}`);
    if (offer.state == TradeOfferManager.ETradeOfferState.Accepted) {
        acceptedTrades += 1;
        tradesToday += 1;
        var storageArray = [];
        for (kl = 0; kl < listings.length; kl++) {
            storageArray.push([]);
        }
        community.getUserInventoryContents(config.steamid, 440, 2, true, function(err, inventory) {

            DEBUG1 && console.log("err", err);
            if (!err) {
                for (j = 0; j < inventory.length; j++) {
                    var k = inventory[j];
                    var index = indexItemBPSORT(k);
                    if (isMetal(k) === false && isKey(k) === false && index !== false) {
                        storageArray[index].push(Number(k.assetid));
                    } else {}
                }
                DEBUG1 && console.log("done");
                for (n = 0; n < listings.length; n++) {
                    if (compareArrays(listings[n].inventory, storageArray[n]) === false) { //add profit count
                        DEBUG1 && console.log("updating index " + n);


                        for (p = 0; p < listings[n].inventory.length; p++) {
                            var item_ID = listings[n].inventory[p]
                            if (!storageArray[n].includes(item_ID)) { //item was sold, in old array but not new

                                var soldfor = Number((listings[n].sellprice.keys + (listings[n].sellprice.ref / keyvalue_bot)).toFixed(5));

                                var ID_tag = "_" + item_ID;

                                listings[n].sold["_" + item_ID] = soldfor;
                                if (listings[n].bought.hasOwnProperty(ID_tag)) {
                                    var boughtfor = listings[n].bought[ID_tag];
                                    var difference = soldfor - boughtfor;
                                    profit += difference;
                                    profitToday += difference;
                                }

                            }

                        }
                        for (q = 0; q < storageArray[n].length; q++) {
                            var bitem_ID = storageArray[n][q];
                            var bID_tag = "_" + bitem_ID;

                            if (!listings[n].inventory.includes(bitem_ID)) { //old array does not have item so it was bought
                                var bboughtfor = Number((listings[n].buyprice.keys + (listings[n].buyprice.ref / keyvalue_bot)).toFixed(5));
                                listings[n].bought[bID_tag] = bboughtfor;
                            }

                        }
                        listings[n].inventory = storageArray[n];
                        backpack.manageListings(n);
                    }

                }
            } else {
                console.error("error getting inventory");
            }
        });
    }
}


client.on("friendMessage", function(steamID, message) {
    if (steamID.getSteamID64() == config.admin) {

        /*
        if (message == "!trades") {
            client.chatMessage(steamID, "Accepted trades since last time you checked: "+acceptedTrades);
            setTimeout(function(){
                acceptedTrades=0;
            },2000);
        }
        else if (message == "!tradesToday") {
            client.chatMessage(steamID, "Accepted trades today: "+tradesToday);
        }
        */
        if (message == "!trades") {
            client.chatMessage(steamID, "Since last time you checked: " + acceptedTrades + " trades accepted, " + receivedTrades + " trades received, " + (acceptedTrades / receivedTrades).toFixed(2) * 100 + "% accept rate");
            client.chatMessage(steamID, "profit since last time you checked: " + profit + " keys");
            setTimeout(function() {
                profit = 0;
            }, 2000);
            setTimeout(function() {
                acceptedTrades = 0;
                receivedTrades = 0;
            }, 2000);
        } else if (message == "!tradesToday") {
            client.chatMessage(steamID, "Todays trading stats: " + tradesToday + " trades accepted, " + receivedTradesToday + " trades received, " + (tradesToday / receivedTradesToday).toFixed(2) * 100 + "% accept rate");
            client.chatMessage(steamID, "Cumulative profit: " + profitToday + " keys");
        } else if (message == "!resetTrades") {
            tradesToday = 0;
            receivedTradesToday = 0;
            client.chatMessage(steamID, "reset daily trades");
            profitToday = 0;
            client.chatMessage(steamID, "reset daily profit");
        } else if (message.split(" ").length === 2 && message.split(" ")[0] == "!resetListings" && Number.isInteger(Number(message.split(" ")[1])) && Number(message.split(" ")[1]) <= listings.length - 1) {
            var deleteIndex = Number(message.split(" ")[1]);
            client.chatMessage(steamID, "deleting recorded buy/sell listings and ids");
            listings[deleteIndex].listing_ids.buy = null;
            listings[deleteIndex].listing_ids.sell = null;
            listings[deleteIndex].inventory = [];
            backpack.manageListings(deleteIndex);
        } else if (message.split(" ").length == 2 && message.split(" ")[0] == "!keyprice") {
            client.chatMessage(steamID, "setting key price to: " + Number(message.split(" ")[1]));
            keyvalue_bot = Number(message.split(" ")[1]);
        } else if (message == "!help") {
            client.chatMessage(steamID, "Commands: !trades, !tradesToday, !resetTrades, !resetListings, !keyprice, !receivedTrades, !receivedTradesToday, !resetreceivedTradesToday, !profit, !resetProfit");
        } else {
            client.chatMessage(steamID, "command not understood");
        }
    }
});

manager.on('pollData', function(pollData) {
    fs.writeFile('polldata.json', JSON.stringify(pollData), function() {});
});

function updateJson() {
    writingJSON = 1;
    tradecount.acceptedTrades = acceptedTrades;
    tradecount.tradesToday = tradesToday;
    tradecount.receivedTrades = receivedTrades;
    tradecount.receivedTradesToday = receivedTradesToday;
    tradecount.keyvalue_bot = keyvalue_bot;
    tradecount.profit = profit;
    tradecount.profitToday = profitToday;
    tradecount.update = update;
    var newTradecount = JSON.stringify(tradecount);
    DEBUG1 && console.log("writing json....");
    var newjson = JSON.stringify(listings, null, 2);
    fs.writeFileSync('listings.json', newjson);
    fs.writeFileSync('backup.json', newjson);
    fs.writeFileSync('tradecount.json', newTradecount);
    writingJSON = 0;
    DEBUG1 && console.log("done writing json");
}
var timerUpdateJson = setInterval(updateJson, 20000);

var timerClearTodayTrades = setInterval(clearStats, 86400000);

function clearStats() {
    tradesToday = 0;
    receivedTradesToday = 0;
}

htmlcache = "";

function updateHTML() {
    async.waterfall([
        backpack.cacheHTML
    ], function(error, newhtml, interval) {
        if (error) {
            console.error("error updating bp html cache");
            setTimeout(updateHTML, 120500);
        } else {
            htmlcache = newhtml;
            DEBUG1 && console.log("updated bp html cache");
            nextinterval = (121 - interval) * 1000;
            DEBUG1 && console.log("interval", interval);
            DEBUG1 && console.log("nextinterval", nextinterval);
            if (nextinterval == undefined) {
                setTimeout(updateHTML, 120500);
            } else if (nextinterval < 0) {
                setTimeout(updateHTML, 7000);
            } else {
                setTimeout(updateHTML, nextinterval);
            }
        }
    });
}
updateHTML();
var stdin = process.openStdin();
DEBUG1 = 1;
DEBUG2 = 1;
stdin.addListener("data", function(d) {
    var input = d.toString().trim();
    if (d == 1) {
        DEBUG1 = 1;
        DEBUG2 = 0;
        console.log('\033c');
        console.log("Incoming trade data:");
        console.log("acceptedTrades", acceptedTrades);
    }
    if (d == 2) {
        DEBUG1 = 0;
        DEBUG2 = 1;
        console.log('\033c');
        console.log("Autoprice data:");
    }
});
autoprice.updateItem(update);

function relog() {
    client.relog(); //relog every 6 hrs
}
var relogTimer = setInterval(relog, 21600000);

client.on('friendRelationship', function(steamID, relationship) { //friends <3
    if (relationship == SteamUser.Steam.EFriendRelationship.RequestRecipient) {
        client.addFriend(steamID);
    }
});

process.on('exit', function() { //using this to save before exiting
    console.log("EXIT");
    writingJSON = 1;
    tradecount.acceptedTrades = acceptedTrades;
    tradecount.tradesToday = tradesToday;
    tradecount.receivedTrades = receivedTrades;
    tradecount.receivedTradesToday = receivedTradesToday;
    tradecount.keyvalue_bot = keyvalue_bot;
    tradecount.profit = profit;
    tradecount.profitToday = profitToday;
    tradecount.update = update;
    var newTradecount = JSON.stringify(tradecount);
    DEBUG1 && console.log("writing json....");
    var newjson = JSON.stringify(listings, null, 2);
    fs.writeFileSync('listings.json', newjson);
    fs.writeFileSync('backup.json', newjson);
    fs.writeFileSync('tradecount.json', newTradecount);
    DEBUG1 && console.log("done writing json");
    writingJSON = 0;
    process.exit(1);
});
process.on('SIGINT', function() { //using this to save before exiting
    console.warn("Stopped by daemon manager");
    process.exit(1);
});

process.on('uncaughtException', function(err) {
    console.error( // console.log
        'Process uncaughtException:', err.message, '\n',
        'Stack:', err.stack
    );

    process.exit(1);
});


startHeartbeat = function() {
    var cookieheader = {
        'cookie': 'stack[hash]=' + config.hash + '; stack[user]=' + config.steamid + '; __utmt=1',
    };
    var options = {
        url: 'https://backpack.tf/api/IAutomatic/IHeartBeat?&version=1.3.3&i_understand_the_risks=true&method=alive&steamid=' + config.steamid + '&token=' + config.token + '&buy_orders=true',
        method: 'POST',
        headers: cookieheader
    };

    function callback(error, response, body) {
        console.log(body);
        if (body.includes('"success":1')) {
            console.log("success sending heartbeat");
        } else {
            console.log("unsuccessful heartbeat");
        }
    }

    request(options, callback);
};
var heartbeatTimer = setInterval(startHeartbeat, 120000);
startHeartbeat();


function relog() {
    console.log("scheduled restart");
    process.exit(1); //relog every 6 hrs
}
var relogTimer = setInterval(relog, 1800000);
