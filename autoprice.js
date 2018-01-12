//2.0
var request = require('request');
var cheerio = require('cheerio');
var async = require('async');
var backpack = require('./backpack.js');
var startItem = 0;
var cloudscraper = require('cloudscraper');
var keypricetoref=34;
var request = require('request');
var keypriceunrounded=34;

function refOverflow_key(x){
    return Math.floor(x/keypriceunrounded);
}
function refOverflow_ref(u){
    return Math.trunc((Math.round(Number((u-(Math.floor(u/keypriceunrounded)*keypriceunrounded)).toFixed(2)) * 9) / 9)*100)/100;
}
function getKeyPrices(){
    var options = {
        url: 'https://backpack.tf/api/IGetCurrencies/v1?key='+config.key,
        method: 'GET',
    };
    function callback(error, responseJSON, body) {
        //var keypricetoref=0;
        console.log(body);
        if(JSON.parse(body).response.currencies.keys.price.value_high){
            keypriceunrounded=(JSON.parse(body).response.currencies.keys.price.value_high+JSON.parse(body).response.currencies.keys.price.value)/2;
            keypricetoref=Math.trunc((Math.round(keypriceunrounded * 9) / 9)*100)/100;
        }
        else{
            keypricetoref=JSON.parse(body).response.currencies.keys.price.value;
            keypriceunrounded=keypricetoref;
        }

    }
    request(options, callback);
}
exports.updateItem=function(listing){
    update=listing; //to save listing
    console.log(listings[listing].url);
    if (listing===0||listing===250||listing===55){
        getKeyPrices();
    }
    if(listing<listings.length){
        var url=listings[listing].url;
        //DEBUG2 && console.log(url);
        cloudscraper.get(url, function(err, resp, html) {
            if (!err){
                $ = cheerio.load(html);
                //var autotrader= $('[class="fa fa-sw fa-flash"], [data-listing_name*="stn.tf"]');
                var autmoatictraderslength=$('[class="fa fa-sw fa-flash"], [data-listing_name*="stn.tf"]').length; //NORMAL CODE FOR WHEN AUTOMATIC WORKS
                //DEBUG2 && console.log("autotraderslength", autmoatictraderslength);
                var autotradercount=0;
                var autoBuyers=[];
                var autoSellers=[];
                var autotrader=$('[class="fa fa-sw fa-flash"], [data-listing_name*="stn.tf"]').eq(autotradercount); //NORMAL CODE FOR WHEN AUTOMATIC WORKS
                while(autotradercount<autmoatictraderslength){
                    autotrader=$('[class="fa fa-sw fa-flash"], [data-listing_name*="stn.tf"]').eq(autotradercount).parent().parent().parent().parent().children().eq(0).children().eq(0).children().eq(0).children().eq(0);
                    if (autotrader.attr("data-listing_intent") == 1)
                    {
                        autoSellers.push(autotrader);
                    }
                    if (autotrader.attr("data-listing_intent") == 0)
                    {
                        autoBuyers.push(autotrader);
                    }
                    autotradercount=autotradercount+1;
                }
                var changeprice=1;
                var keySellPrices=[];
                var refSellPrices=[];
                var keyBuyPrices=[];
                var refBuyPrices=[];
                var k=0;
                var normalBuy=1;
                var normalSell=1;
                function filterSellers(){
                    while (k < autoSellers.length)
                    {
                        if(autoSellers[k].attr('data-listing_price').includes('ref') && !(autoSellers[k].attr('data-listing_price').includes('key')) && autoSellers[k].attr('data-listing_mp')!=1 &&!(autoSellers[k].attr('data-listing_name').includes(config.name))){
                            ////DEBUG2 && console.log('ref only'); //In each we don't want our own listings
                            refSellPrices.push(autoSellers[k].attr('data-listing_price').replace(/[^0-9.,]/g, '').split(",")[0]);
                            keySellPrices.push("0"); //No keys involved, to fix listing issues
                        }
                        if(!(autoSellers[k].attr('data-listing_price').includes('ref')) && autoSellers[k].attr('data-listing_price').includes('key') && autoSellers[k].attr('data-listing_mp')!=1 &&!(autoSellers[k].attr('data-listing_name').includes(config.name))){
                            ////DEBUG2 && console.log('key only');
                            refSellPrices.push("0"); //for cases with no ref involved
                            keySellPrices.push(autoSellers[k].attr('data-listing_price').replace(/[^0-9.,]/g, '').split(",")[0]);
                        }
                        if(autoSellers[k].attr('data-listing_price').includes('ref') && autoSellers[k].attr('data-listing_price').includes('key') && autoSellers[k].attr('data-listing_mp')!=1 &&!(autoSellers[k].attr('data-listing_name').includes(config.name))){
                            ////DEBUG2 && console.log('key and ref');
                            refSellPrices.push(autoSellers[k].attr('data-listing_price').replace(/[^0-9.,]/g, '').split(",")[1]);// Key prices come first
                            keySellPrices.push(autoSellers[k].attr('data-listing_price').replace(/[^0-9.,]/g, '').split(",")[0]);
                        }
                        k=k+1;
                        //DEBUG2 && console.log("k", k);
                    }
                }
                if (autoSellers.length !=0)
                {
                    filterSellers();
                }
                k=0;
                function filterBuyers(){
                    while (k < autoBuyers.length)
                    {
                        if(autoBuyers[k].attr('data-listing_price').includes('ref') && !(autoBuyers[k].attr('data-listing_price').includes('key')) &&!(autoBuyers[k].attr('data-listing_name').includes(config.name))){
                            ////DEBUG2 && console.log('ref only'); //In each we don't want our own listings
                            refBuyPrices.push(autoBuyers[k].attr('data-listing_price').replace(/[^0-9.,]/g, '').split(",")[0]);
                            keyBuyPrices.push("0"); //No keys involved, to fix listing issues
                        }
                        if(!(autoBuyers[k].attr('data-listing_price').includes('ref')) && autoBuyers[k].attr('data-listing_price').includes('key') &&!(autoBuyers[k].attr('data-listing_name').includes(config.name))){
                            ////DEBUG2 && console.log('key only');
                            refBuyPrices.push("0"); //for cases with no ref involved
                            keyBuyPrices.push(autoBuyers[k].attr('data-listing_price').replace(/[^0-9.,]/g, '').split(",")[0]);
                        }
                        if(autoBuyers[k].attr('data-listing_price').includes('ref') && autoBuyers[k].attr('data-listing_price').includes('key') &&!(autoBuyers[k].attr('data-listing_name').includes(config.name))){
                            ////DEBUG2 && console.log('key and ref');
                            refBuyPrices.push(autoBuyers[k].attr('data-listing_price').replace(/[^0-9.,]/g, '').split(",")[1]);// Key prices come first
                            keyBuyPrices.push(autoBuyers[k].attr('data-listing_price').replace(/[^0-9.,]/g, '').split(",")[0]);
                        }
                        k=k+1;
                        ////DEBUG2 && console.log("k", k);
                    }
                }
                if (autoBuyers.length !=0){
                    filterBuyers();
                }
                if (keySellPrices.length === 0){ //when no buyers/sellers, get data of all sellers/buyers
                    var allSeller=$('[data-listing_intent="1"]');
                    var alltradercount=0;
                    while (alltradercount< allSeller.length){
                        autoSellers.push(allSeller.eq(alltradercount));
                        alltradercount=alltradercount+1;
                    }
                    normalSell=0;
                    k=0;
                    filterSellers();
                }
                if (keyBuyPrices.length === 0){
                    //DEBUG2 && console.log("zero auto buyers");
                    var allBuyer=$('[data-listing_intent="0"]');
                    var alltradercount=0;
                    while (alltradercount< allBuyer.length){
                        autoBuyers.push(allBuyer.eq(alltradercount));
                        alltradercount=alltradercount+1;
                    }
                    //autoBuyers=$('[data-listing_intent="0"]');
                    normalBuy=0;
                    k=0;
                    filterBuyers();
                }
                //DEBUG2 && console.log("key sell", keySellPrices);
                //DEBUG2 && console.log("ref sell", refSellPrices);
                //DEBUG2 && console.log("key buy", keyBuyPrices);
                //DEBUG2 && console.log("ref buy", refBuyPrices);
                var buyPriceKeys = "";
                var reftotalbuyprice=(Number(keyBuyPrices[0])*Number(keypricetoref))+Number(refBuyPrices[0]);
                var reftotalsellprice=(Number(keySellPrices[0])*Number(keypricetoref))+Number(refSellPrices[0]);
                var bpPrice;
                if (autoBuyers.length>0){
                    bpPrice=Number(autoBuyers[0].attr('data-price'));
                }
                else if(autoSellers.length>0){
                    bpPrice=Number(autoSellers[0].attr('data-price'));
                }
                if (!reftotalsellprice){
                    reftotalsellprice=bpPrice;
                }
                //DEBUG2 && console.log("reftotalbuyprice", reftotalbuyprice);
                //DEBUG2 && console.log("reftotalsellprice", reftotalsellprice);
                var refpricedifference=(reftotalsellprice-reftotalbuyprice).toFixed(2);
                if(normalBuy==1){
                    buyPriceKeys = keyBuyPrices[0];
                }
                if(normalBuy===0){
                    var medianBuy=Math.trunc(keyBuyPrices.length/2);
                    buyPriceKeys = keyBuyPrices[medianBuy];
                }
                if (autoBuyers.length < 1){ //experiment
                    buyPriceKeys = "idiot";
                    var changeprice=0;
                }

                var buyPriceRef = "";
                //buyPriceRef.value = refBuyPrices[0];

                if(normalBuy==1){
                    if(refpricedifference>0.23){
                        //DEBUG2 && console.log("test");
                        //DEBUG2 && console.log(Number(refBuyPrices[0]));
                        var newprice=Number(refBuyPrices[0])+0.11; //OVERCUT
                        //DEBUG2 && console.log(newprice.toFixed(2));
                        buyPriceRef = newprice.toFixed(2);// +++ 0.11;
                    }
                    if(refpricedifference<=0.23){
                        buyPriceRef = refBuyPrices[0];
                        if(refpricedifference<0){
                            //DEBUG2 && console.log("idiot");
                            buyPriceRef = "idiot";
                            var changeprice=0;
                        }
                    }
                    if(refpricedifference==0){
                        //DEBUG2 && console.log("no difference");
                        var newpricerounded=Number(refBuyPrices[0]) -0.11
                        buyPriceRef = newpricerounded.toFixed(2);
                    }
                    if (buyPriceRef >= Number(keypricetoref) && Number(keyBuyPrices[0])===0 ){ //experiment
                        //DEBUG2 && console.log("dont want ref prices");
                        buyPriceKeys = refOverflow_key(Number(buyPriceRef));
                        buyPriceRef = refOverflow_ref(Number(buyPriceRef));
                        //buyPriceRef = "idiot";
                        //var changeprice=0;
                    }
                }
                if(normalBuy===0){
                    var medianBuyref=Math.trunc(refBuyPrices.length/2); //use median of all sellers if no auto
                    buyPriceRef = refBuyPrices[medianBuyref];
                }

                var sellPriceKeys= "";
                //sellPriceKeys.value = keySellPrices[0];
                //DEBUG2 && console.log("refpriceifference", refpricedifference);
                if(normalSell==1){
                    if (refpricedifference>0.23 && refSellPrices[0] ==0) //For carrying key values, i.e. 2 keys 0 ref -0.11 ref
                    {
                        var keycarry=Number(keySellPrices[0])-1;
                        //DEBUG2 && console.log("keycarry");
                        //DEBUG2 && console.log(Number(keySellPrices[0]));
                        //DEBUG2 && console.log(Number(keySellPrices[0])-1);
                        sellPriceKeys = keycarry;
                    }
                    ////DEBUG2 && console.log("refSellPrices[0]",refSellPrices[0]);
                    else{
                        sellPriceKeys = keySellPrices[0];
                    }
                }
                if(normalSell===0){
                    var medianSell=Math.trunc(keySellPrices.length/2); //use median of all sellers if no auto
                    sellPriceKeys = keySellPrices[medianSell];
                }
                if(keySellPrices.length < 1){
                    //DEBUG2 && console.log("no sellers");
                    //sellPriceKeys = "idiot";
                    //DEBUG2 && console.log(bpPrice);
                    keySellPrices.push(0);
                    refSellPrices.push(bpPrice*1.15);
                    /*
                    if((reftotalbuyprice*1.5)>bpPrice){
                    //DEBUG2 && console.log("buy price *1.5 greater");
                    keySellPrices.push(0);
                    refSellPrices.push(reftotalbuyprice*1.5);
                    }
                    else{
                    //DEBUG2 && console.log("bp price greater");
                    keySellPrices.push(0);
                    refSellPrices.push(bpPrice);
                    }*/
                    //DEBUG2 && console.log(keySellPrices);
                    //DEBUG2 && console.log(refSellPrices);
                    //var changeprice=0;
                }

                var sellPriceRef= "";

                //sellPriceRef.value = refSellPrices[0];

                if(normalSell==1){
                    if(refpricedifference>0.23){
                        if (refSellPrices[0] ==0){ //for undercutting when there are keys but no ref
                            var newsellpriceref=Number(keypricetoref)-0.11; //keeping this because key carry stuff
                            sellPriceRef = newsellpriceref.toFixed(2);
                        }
                        else{
                            var newpriceref=Number(refSellPrices[0])-0.11; //UNDERCUT
                            sellPriceRef = newpriceref.toFixed(2);
                        }
                    }
                    else{
                        sellPriceRef = refSellPrices[0];
                    }
                }
                if(normalSell===0){
                    var medianSellref=Math.trunc(refSellPrices.length/2); //use median of all sellers or buyers if no automatic
                    sellPriceRef = refSellPrices[medianSellref];
                }
                if (sellPriceRef >= Number(keypricetoref) && Number(keySellPrices[0])===0 ){ 
                    //DEBUG2 && console.log("dont want ref sell prices");
                    //sellPriceRef= "idiot";
                    //var changeprice=0;
                    sellPriceKeys = refOverflow_key(Number(sellPriceRef));
                    sellPriceRef = refOverflow_ref(Number(sellPriceRef));
                }
                function toNearestNinth(metal){
                    return Math.trunc((Math.round(metal*9)/9)*100)/100;
                }
                sellPriceRef=toNearestNinth(sellPriceRef);
                buyPriceRef=toNearestNinth(buyPriceRef);  //verify nearest ninth
                function updateNext(){
                    //DEBUG2 && console.log("updating next?");
                    var waittime = (Math.random()/4 + 1.6)*1000;
                    //DEBUG2 && console.log(waittime);
                    
                    if (listing===0){
                        setTimeout(function() {
                            console.log("wrapping around");
                            setImmediate(function() {
                                exports.updateItem(listings.length-1);
                            });
                        }, waittime);

                    }
                    else{
                        setTimeout(function() {
                            setImmediate(function() {
                                exports.updateItem(listing-1);
                            });
                        }, waittime);
                    }
                }
                if (buyPriceKeys==undefined||buyPriceRef==undefined||sellPriceKeys==undefined||sellPriceRef==undefined){
                    changeprice=0;
                }
                if (isNaN(buyPriceKeys)||isNaN(buyPriceRef)||isNaN(sellPriceKeys)||isNaN(sellPriceRef)){
                    changeprice=0;
                }
                if ((keyvalue_bot*buyPriceKeys+buyPriceRef)>=(sellPriceKeys*keyvalue_bot+sellPriceRef)){
                    changeprice=0;
                }
                if (Number(sellPriceKeys)>50){
                    changeprice=0;
                }
                //price difference
                var keyDifference1=Number(sellPriceKeys)-(listings[listing].sellprice.keys);
                var keyDifference2=Number(buyPriceKeys)-listings[listing].buyprice.keys;
                if (keyDifference1>10 || keyDifference1<-10){
                    console.log("keyDifference1 (sellprice difference) over thresholds so not changing");
                    changeprice=0;
                }
                if (keyDifference2>10 || keyDifference2<-10){
                    console.log("keyDifference1 (buyprice difference) over thresholds so not changing");
                    changeprice=0;
                }
                //reftotalbuyprice
                var previousRefBuyPrice=(listings[listing].buyprice.keys*Number(keypricetoref))+buyPriceRef;
                var percentDifference=(reftotalbuyprice-previousRefBuyPrice)/previousRefBuyPrice;
                console.log("percentdifference in buyprice: "+(percentDifference).toFixed(3)+"%");
    			if (percentDifference>0.40){
    				console.log("buyprice percent difference to high so not changing");
    				changeprice=0;
    			}
                if (changeprice==1){
                    //DEBUG2 && console.log("changing price...");
                    var changeBuyListing=false;
                    var changeSellListing=false;
                    if (listings[listing].listing_ids.buy!==null && (listings[listing].buyprice.keys!=Number(buyPriceKeys) || listings[listing].buyprice.ref!=Number(buyPriceRef))){
                        console.log("changing buy listing?...");
                        changeBuyListing=true;
                    }
                    if (listings[listing].listing_ids.sell!==null && (listings[listing].sellprice.keys!=Number(sellPriceKeys) || listings[listing].sellprice.ref!=Number(sellPriceRef))){
                        console.log("changing sell listing?...");
                        changeSellListing=true;
                    }
                    console.log("newprices:");
                    console.log("sell: "+Number(sellPriceKeys)+"keys "+Number(sellPriceRef)+" ref");
                    console.log("buy: "+Number(buyPriceKeys)+"keys "+Number(buyPriceRef)+" ref");
                    listings[listing].sellprice.keys=Number(sellPriceKeys);
                    listings[listing].sellprice.ref=Number(sellPriceRef);
                    listings[listing].buyprice.keys=Number(buyPriceKeys);
                    listings[listing].buyprice.ref=Number(buyPriceRef);
                    if(listings[listing].inventory.length<listings[listing].maxstock){
                        backpack.createBuy(listing);
                    }
                    if(listings[listing].inventory.length>0){
                        backpack.createSell(listings[listing].inventory[0], listing);
                    }
                    updateNext();
                }
                else{
                    console.log("NOT SETTING TO: sell: "+Number(sellPriceKeys)+"keys "+Number(sellPriceRef)+" ref");
                    console.log("buy: "+Number(buyPriceKeys)+"keys "+Number(buyPriceRef)+" ref");
                    console.log("test");
                    updateNext();
                }
            }
        });
    }
};

