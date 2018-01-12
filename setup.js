var SteamUser = require('steam-user');
var SteamCommunity = require('steamcommunity');
var SteamTotp = require('steam-totp');
var TradeOfferManager = require('steam-tradeoffer-manager'); // use require('steam-tradeoffer-manager') in production
var fs = require('fs');
var async=require('async');
var backpack=require('./backpack.js');
var client = new SteamUser();
/*
var TeamFortress2 = require('tf2');
var tf2 = new TeamFortress2(client);*/
var manager = new TradeOfferManager({
    "steam": client, // Polling every 30 seconds is fine since we get notifications from Steam
    "domain": "example.com", // Our domain is example.com
    "language": "en" // We want English item descriptions
});
var community = new SteamCommunity();
if (fs.existsSync('config.json')) {
    config = JSON.parse(fs.readFileSync('config.json'));
}
// Steam logon options
var logOnOptions = {
    "accountName": config.username,
    "password": config.password,
    "twoFactorCode": SteamTotp.getAuthCode(config.shared_secret)
};


if (fs.existsSync('polldata.json')) {
    manager.pollData = JSON.parse(fs.readFileSync('polldata.json'));
}
if (fs.existsSync('listings.json')) {
    listings = JSON.parse(fs.readFileSync('listings.json'));
}
client.logOn(logOnOptions);

client.on('loggedOn', function() {
    console.log("Logged into Steam");
});


function indexItem(item){
    var indexMatches=[];
    var itemdefindex=def_index(item);
    var iquality=quality(item);
    var iuncraft=isUncraft(item);
    var iaustralium=australium(item);
    var ikillstreak=killstreakTier(item);
    for (i=0;i<listings.length;i++){
        if(listings[i].def_index===itemdefindex){
            indexMatches.push(i);
        }
    }
    if (indexMatches.length===0){
        return false; //item invalid b/c no defindex matches
    }
    else{
        for (i=0; i<indexMatches.length; i++){
            var bank=listings[indexMatches[i]];
            //console.log(bank);
            //console.log(indexMatches);
            if (iquality===bank.quality && iuncraft===bank.uncraft && iaustralium===bank.australium && (ikillstreak===bank.killstreak||bank.killstreak===0||(bank.killstreak===-1&&ikillstreak===0))){
                return indexMatches[i];
            }
            else if (i===indexMatches.length-1){
                return false; //there were index matches but no actual matches
            } 
        }
    }
}
function isUncraft(item){
    if (JSON.stringify(item.descriptions).includes("Not Usable in Crafting")){
        DEBUG1 && console.log("uncraft");
        return true;
    }
    else{
        return false;
    }
}
function killstreakTier(item){
    if (!(item.market_hash_name.includes("Killstreak"))){
        return 0;
    }
    else if (item.market_hash_name.includes("Professional Killstreak")){
        return 3;
    }
    else if (item.market_hash_name.includes("Specialized Killstreak")){
        return 2;
    }
    else if (item.market_hash_name.includes("Killstreak")){
        return 1;
    }
}
function def_index(item){
    //console.log("defindex" + Number(JSON.stringify(item.actions).replace(/^.+wiki.teamfortress.com\/scripts\/itemredirect.php\?id=/, '').replace(/&.*/,"")));
    return Number(JSON.stringify(item.actions).replace(/^.+wiki.teamfortress.com\/scripts\/itemredirect.php\?id=/, '').replace(/&.*/,""))
}
function quality(item){
    var itags=JSON.stringify(item.tags);
    //console.log(marketname);
    //console.log(item);
    if (itags.includes('Strange') && itags.includes('Strange Part')===false){
        return 11;
    }
    if (itags.includes('Unique')){
        return 6;
    }
    if (itags.includes('Genuine')){
        return 1;
    }
    if (itags.includes('Vintage')){
        return 3;
    }
    if (itags.includes('Haunted')){
        return 13;
    }
    else {
        return 20; //we don't know the quality, but this will guarantee it does not match our listings
    }
}
function australium(item){
    if (item.market_hash_name.includes("Australium")){
        return true;
    }
    else{
        return false;
    }
}
function isMetal(item){
    if (item.market_hash_name==="Refined Metal") {
        //DEBUG1 && console.log("ref");
        return 9;
    }
    else if (item.market_hash_name==="Reclaimed Metal") {
        //DEBUG1 && console.log("rec");
        return 3;
    }
    else if (item.market_hash_name==="Scrap Metal") {
        //DEBUG1 && console.log("scrap");
        return 1;
    }
    else{
        return false;
    }
}
function isKey(item){
    if (item.market_hash_name==="Mann Co. Supply Crate Key") {
        //DEBUG1 && console.log("key");
        return 1;
    }
    else{
        return false;
    }
}
client.on('webSession', function(sessionID, cookies) {
    console.log("starting loop");
    for (kl=0;kl<listings.length;kl++){
        listings[kl].inventory=[];
        listings[kl].listing_ids.sell=null;
        listings[kl].listing_ids.buy=null;
        listings[kl].bought={};
        listings[kl].sold={};
    }
    community.getUserInventoryContents(config.steamid, 440, 2, true, function(err,inventory){
        console.log(err);
        console.log("test");
        console.log(inventory);
        //console.log(inventory);
        //console.log(inventory[0]);
        for(j=0;j<inventory.length;j++){
            //console.log(j);
            var k=inventory[j];
            var index=indexItem(k);
            if (isMetal(k)===false && isKey(k)===false && index!==false){
                listings[index].inventory.push(Number(k.assetid));
                if (index<=93000){
                    console.log("found match" + index);
                }
            }
            else{
                console.log("currency");
            }
        }
        for (kl=0;kl<listings.length;kl++){
            for (p=0;p<listings[kl].inventory.length;p++){
                var item_ID=listings[kl].inventory[p];
                listings[kl].bought["_"+item_ID]=Number((listings[kl].buyprice.keys + (listings[kl].buyprice.ref/34.11)).toFixed(5));
            }
        }
        console.log("writing json....");
        var newjson=JSON.stringify(listings, null , 2);
        fs.writeFile('listings.json', newjson, function(){
            console.log("done writing json");
        });
    });
});
DEBUG1=1
var timerUpdateJson=setInterval(updateJson, 10000); //300000=5 mins
function updateJson(){
    console.log("writing json....");
    var newjson=JSON.stringify(listings, null , 2);
    fs.writeFile('listings.json', newjson, function(){
        console.log("done writing json");
    });
}
