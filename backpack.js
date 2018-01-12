//2.0
var request = require('request');
var cheerio = require('cheerio');
var cloudscraper = require('cloudscraper');
//var events = require('events');
//var eventEmitter = new events.EventEmitter();

exports.checkBanned = function(steamid, bCallback) {
    console.log("checking if "+steamid+" is banned");
    var options = {
        url: 'https://backpack.tf/api/users/info/v1?key='+config.key+'&steamids=' + steamid,
        method: 'GET',
    };
    function callback(error, response, body){
        if (!error && response.statusCode == 200) {
            //DEBUG1 && console.log(body);
            var userdata=JSON.parse(body);
            if(userdata.users[steamid].bans){
                if(userdata.users[steamid].bans.steamrep_scammer==1){
                    DEBUG1 && console.log("SR Mark");
                    return bCallback(3);
                }
            }
            if (userdata.users[steamid].bans){
                if (userdata.users[steamid].bans.all){
                    if(userdata.users[steamid].bans.all.end==-1){
                        {
                            DEBUG1 && console.log("Banned on bp.tf");
                            return bCallback(3);
                        }
                    }
                    else {
                        DEBUG1 && console.log("clean");
                        return bCallback(null);
                    }
                }
                else {
                    DEBUG1 && console.log("clean");
                    return bCallback(null);
                }
            }
            else {
                DEBUG1 && console.log("clean");
                return bCallback(null);
            }
        }
    }
    request(options, callback);
};
exports.manageListings=function(index){
	console.log("managing listings for index" + index);
	//console.log(listings[index]);
    if ((listings[index].listing_ids.sell!==null && listings[index].listing_ids.sell.includes(listings[index].inventory[0])===false && listings[index].inventory.length>0)||(listings[index].listing_ids.sell===null && listings[index].inventory.length>0)){
    	//console.log("creating sell for index "+index);
        exports.createSell(listings[index].inventory[0], index);
    }
    if (listings[index].inventory.length>=listings[index].maxstock && listings[index].listing_ids.buy!==null){
    	//console.log("deleting buy for index "+index);
        exports.deleteBuyListing(index);
    }
    if (listings[index].inventory.length<listings[index].maxstock){
    	//console.log("creating buy for index "+index);
        exports.createBuy(index);
    }
};
exports.createSell = function(itemid, itemIndex){
    function checkIfItemKnown(assetidzz){
        for (tkzz=0;tkzz<listings.length;tkzz++){
            if (listings[tkzz].inventory.includes(assetidzz)){
                return true;
            }
            else if (tkzz===listings.length-1){
                return false;
            }
        }
    }
    //DEBUG1 && console.log(htmlcache);
    if (htmlcache.includes(itemid)){
        DEBUG1 && console.log("includes id, creating");
        var headers = {
            'content-type': 'application/json',
        };
        var sellpricedata_key=listings[itemIndex].sellprice.keys;
        var sellpricedata_ref=listings[itemIndex].sellprice.ref;

        var lsellPriceRef=sellpricedata_ref;
        var lsellkeysstring = "";
        var lsellPriceKeys=sellpricedata_key;
        var lsellrefstring=sellpricedata_ref;
        if (lsellPriceKeys==1){
            lsellkeysstring="1 key + ";
        }
        if (lsellPriceKeys>1){
            lsellkeysstring=lsellPriceKeys+" keys + ";
        }
        if (String(lsellPriceRef).includes(".99")){
            lsellrefstring=Number(lsellrefstring)+0.01;
        }
        if (String(lsellPriceRef).includes(".89")){
            lsellrefstring=Number(lsellrefstring)-0.01;
        }

        var details="⚡[⇄] 24/7 TRADING BOT! //⚡ Trades auto accept in seconds for listed amount | selling for "+lsellkeysstring+lsellrefstring+" ref, maxstock:"+lmaxstock;
        var data= '{"listings":[{"intent":1,"id":'+itemid+',"currencies":{"keys":'+sellpricedata_key+',"metal":'+sellpricedata_ref+'},"details":"'+details+'"}]}';

        var options = {
            url: 'https://backpack.tf/api/classifieds/list/v1?token='+config.token+'',
            method: 'POST',
            headers: headers,
            body: data
        };

        function callback(error, response, body) {
            if (!error && response.statusCode == 200) {
                DEBUG1 && console.log(body);
                if(body.includes('{"created":1}')){
                    listings[itemIndex].listing_ids.sell='440_'+itemid;
                    console.log("setting sell to: 440_"+itemid);
                }
            }
            if (body.includes('retry')){
                exports.deleteSellListing(itemIndex);
                setTimeout(function() {
                    exports.createSell(itemid, itemIndex);
                }, 10000);
            }
            if (error){
                DEBUG1 && console.log("ERROR !:" +error);
                DEBUG1 && console.log(body);
            }
        }

        request(options, callback);
    }
    else{
        if (checkIfItemKnown(itemid)===true){
            DEBUG1 && console.log(itemid+" missing, waiting");
            setTimeout(function() {
                setImmediate(function() {
                    exports.createSell(itemid, itemIndex);
                });
            }, 32000);
        }
    }
};

exports.cacheHTML=function(waterfallCallback){
    cloudscraper.get("https://backpack.tf/profiles/"+config.steamid, function(err, resp, html) {
        if (err){
            return waterfallCallback(err);
        }
        else{
            var zkl=cheerio.load(html);
            var interval=(Math.round((new Date()).getTime()/1000))-Date.parse(zkl('[class=panel-heading]').eq(3).children().eq(0).children().eq(0).children().eq(1).attr('datetime'))/1000;
            return waterfallCallback(null, html, interval);
        }
    });
};

exports.createBuy=function (itemIndex){
    var headers = {
        'content-type': 'application/json',
    };
    var data={};
    data.listings=[];

    var y ={};
    y.intent=0;
    y.item={};
    y.item.quality=listings[itemIndex].quality;

    var name=decodeURI(listings[itemIndex].url.replace(/^.+stats\/(Strange|Genuine|Unique|Vintage|Haunted)\//,'').replace(/\/.*/,'').replace('%3A', ':'))
    //console.log("name", name);
    y.item.item_name=name;
    if(listings[itemIndex].uncraft===true){
        DEBUG1 && console.log("uncraft");
        y.item.craftable=0;
    }
    var lbuyPriceKeys=listings[itemIndex].buyprice.keys;
    var lbuykeysstring = "";
    var lbuyPriceRef=listings[itemIndex].buyprice.ref;
    var lbuyrefstring=listings[itemIndex].buyprice.ref;
    var lmaxstock=listings[itemIndex].maxstock;
    if (lbuyPriceKeys==1){
        lbuykeysstring="1 key + ";
    }
    if (lbuyPriceKeys>1){
        lbuykeysstring=lbuyPriceKeys+" keys + ";
    }
    if (String(lbuyPriceRef).includes(".99")){
        lbuyrefstring=Number(lbuyrefstring)+0.01;
    }
    if (String(lbuyPriceRef).includes(".89")){
        lbuyrefstring=Number(lbuyrefstring)-0.01;
    }
    y.details="⚡[⇄] 24/7 TRADING BOT! //⚡ Trades auto accept in seconds for listed amount | buying for "+lbuykeysstring+lbuyrefstring+" ref";
    y.currencies={};
    y.currencies.metal=lbuyPriceRef;
    y.currencies.keys=lbuyPriceKeys;
    data.listings.push(y);
    dataSend=JSON.stringify(data);
    //console.log(dataSend);

    var options = {
        url: 'https://backpack.tf/api/classifieds/list/v1?token='+config.token+'',
        method: 'POST',
        headers: headers,
        body: dataSend
    };
    function callback(error, response, body) {
        if (!error && response.statusCode == 200) {
            console.log(body);
            if (body.includes('"created":1')){
            	if (listings[itemIndex].listing_ids.static_buy){
            		listings[itemIndex].listing_ids.buy=listings[itemIndex].listing_ids.static_buy;
            	}
            	else{
                	findListingId(itemIndex, name, 0);
                }
            }
        }
        if (body.includes("retry")){
        	purgeBuy(itemIndex, name);
        }
    	if (error){
            DEBUG1 && console.log("error:"+error);
            //DEBUG1 && console.log(body);
        }
    }
    request(options, callback);
};
function purgeBuy(zx, name){
    console.log("PURGING LISTING");
    var itemIndex=zx;
    if (listings[itemIndex].listing_ids.static_buy){
        var listingId=listings[itemIndex].listing_ids.static_buy;
        var headers = {
            'content-type': 'application/json',
        };

        var data= '{"listing_ids": [ "'+listingId+'" ] }';

        var options = {
            url: 'https://backpack.tf/api/classifieds/delete/v1?token='+config.token+'',
            method: 'DELETE',
            headers: headers,
            body: data
        };

        function callback(error, response, body) {
            DEBUG1 && console.log(body);
            if (body.includes('"deleted":1')){
            listings[itemIndex].listing_ids.buy=null;
            	exports.createBuy(itemIndex);
            }
            else{
            	listings[zx].listing_ids.static_buy=null;
            	purgeBuy(zx, name);
            }
            
        }

        request(options, callback);
    }
    else{
        var lquality=listings[zx].quality;
        var lcraftable;
        if (listings[zx].uncraft===false){
            lcraftable=1;
        }
        else{
            lcraftable=-1;
        }
        var laustralium;
        if (listings[zx].australium===false){
            laustralium=-1;
        }
        else{
            laustralium=1;
        }
        var lkillstreak;
        if (listings[zx].killstreak===-1){
            lkillstreak=0;
        }
        else{
            lkillstreak=listings[zx].killstreak;
        }
        var urlname=name.replace('Australium ', '').replace('Specialized Killstreak ','').replace('Professional Killstreak ','').replace('Killstreak ', ''); //australium causes unnecessary stacks for some reason , SO DO KILLSTREAKS
        var cookieheader={
            'Cookie': 'stack[hash]='+config.hash+'; stack[user]='+config.steamid
        };
        DEBUG1 && console.log('https://backpack.tf/classifieds?steamid='+config.steamid+'&item='+urlname+'&quality='+lquality+'&craftable='+lcraftable+'&australium='+laustralium+'&killstreak_tier='+lkillstreak);
        var options = {
            url: 'https://backpack.tf/classifieds?steamid='+config.steamid+'&item='+urlname+'&quality='+lquality+'&craftable='+lcraftable+'&australium='+laustralium+'&killstreak_tier='+lkillstreak,
            method: 'GET',
            headers: cookieheader
        };

        function callback(err, resp, html) {
            if (!err) {
                $ = cheerio.load(html);
                var newBuyOrder=$('[data-listing_intent=0]').eq(0).parent().parent().parent().parent().attr('id').replace('listing-', '');
                DEBUG1 && console.log("newBuyOrder "+ newBuyOrder);
                listings[itemIndex].listing_ids.static_buy=newBuyOrder;
                var listingId=listings[itemIndex].listing_ids.buy;
                var headers2 = {
                    'content-type': 'application/json',
                };

                var data2= '{"listing_ids": [ "'+newBuyOrder+'" ] }';

                var options2 = {
                    url: 'https://backpack.tf/api/classifieds/delete/v1?token='+config.token,
                    method: 'DELETE',
                    headers: headers2,
                    body: data2
                };

                function callback2(error, response, body) {
                    DEBUG1 && console.log(body);
                    listings[itemIndex].listing_ids.buy=null;
                    exports.createBuy(itemIndex);
                }
                request(options2, callback2);
                //DEBUG1 && console.log(body);
                //DEBUG1 && console.log(response);
            }
            else{
                DEBUG1 && console.log("err findlisting" + err);
                //DEBUG1 && console.log(body);
                //DEBUG1 && console.log(response);
            }
        }

        cloudscraper.request(options, callback);
    }
}
function findListingId(zx, name, count){
    var lquality=listings[zx].quality;
    var lcraftable;
    if (listings[zx].uncraft===false){
        lcraftable=1;
    }
    else{
        lcraftable=-1;
    }
    var laustralium;
    if (listings[zx].australium===false){
        laustralium=-1;
    }
    else{
        laustralium=1;
    }
    var lkillstreak;
    if (listings[zx].killstreak===-1){
        lkillstreak=0;
    }
    else{
        lkillstreak=listings[zx].killstreak;
    }
    var urlname=name.replace('Australium ', '').replace('Specialized Killstreak ','').replace('Professional Killstreak ','').replace('Killstreak ', ''); //australium causes unnecessary stacks for some reason , SO DO KILLSTREAKS
    var cookieheader={
    'cookie': 'stack[hash]='+config.hash+'; stack[user]='+config.steamid+'; __utmt=1',
    'accept-language': 'en-US,en;q=0.9',
    'upgrade-insecure-requests': '1',
    'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/62.0.3202.94 Safari/537.36',
    'accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
    'cache-control': 'max-age=0',
    'authority': 'ssl.google-analytics.com',
	'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/62.0.3202.94 Safari/537.36',
	'Origin': 'https://backpack.tf'
    };
    DEBUG1 && console.log('https://backpack.tf/classifieds?steamid='+config.steamid+'&item='+urlname+'&quality='+lquality+'&craftable='+lcraftable+'&australium='+laustralium+'&killstreak_tier='+lkillstreak);
    var options = {
        url: 'https://backpack.tf/classifieds?steamid='+config.steamid+'&item='+urlname+'&quality='+lquality+'&craftable='+lcraftable+'&australium='+laustralium+'&killstreak_tier='+lkillstreak,
        method: 'GET',
        headers: cookieheader
    };

    function callback(err, resp, html) {
    //console.log(html);
        if (!err) {
            $ = cheerio.load(html);
            //console.log($('[data-listing_intent=0]'));
            if ($('[data-listing_intent=0]').eq(0).parent().parent().parent().parent().attr('id')!=undefined){
            	var newBuyOrder=$('[data-listing_intent=0]').eq(0).parent().parent().parent().parent().attr('id').replace('listing-', '');
            	DEBUG1 && console.log("newBuyOrder "+ newBuyOrder);
            	listings[zx].listing_ids.buy=newBuyOrder;
            	listings[zx].listing_ids.static_buy=newBuyOrder;
            //DEBUG1 && console.log(body);
            //DEBUG1 && console.log(response);
            }
            else if (count<2){
            	console.log("missingid " + $('[data-listing_intent=0]').eq(0).parent().parent().parent().parent().attr('id'));
            	setTimeout(function(){
            		findListingId(zx, name, count+1)
            	}, 5000);
            }
        }
        else{
            DEBUG1 && console.log("err findlisting" + err);
            //DEBUG1 && console.log(body);
            //DEBUG1 && console.log(response);
        }
    }

    cloudscraper.request(options, callback);
}

exports.deleteBuyListingCallback=function (itemIndex, needed, asyncCallback){
    var name=decodeURI(listings[itemIndex].url.replace(/^.+stats\/(Strange|Genuine|Unique|Vintage|Haunted)\//,'').replace(/\/.*/,'').replace('%3A', ':'))
	console.log("DELETE LISTING CALLBACK");
	var zx=itemIndex;
    var lquality=listings[zx].quality;
    var lcraftable;
    if (listings[zx].uncraft===false){
        lcraftable=1;
    }
    else{
        lcraftable=-1;
    }
    var laustralium;
    if (listings[zx].australium===false){
        laustralium=-1;
    }
    else{
        laustralium=1;
    }
    var lkillstreak;
    if (listings[zx].killstreak===-1){
        lkillstreak=0;
    }
    else{
        lkillstreak=listings[zx].killstreak;
    }
    var urlname=name.replace('Australium ', '').replace('Specialized Killstreak ','').replace('Professional Killstreak ','').replace('Killstreak ', ''); //australium causes unnecessary stacks for some reason , SO DO KILLSTREAKS
    var cookieheader={
            'cookie': 'stack[hash]='+config.hash+'; stack[user]='+config.steamid+'; __utmt=1',
    'accept-language': 'en-US,en;q=0.9',
    'upgrade-insecure-requests': '1',
    'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/62.0.3202.94 Safari/537.36',
    'accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
    'cache-control': 'max-age=0',
    'authority': 'ssl.google-analytics.com',
	'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/62.0.3202.94 Safari/537.36',
	'Origin': 'https://backpack.tf'
    };
    DEBUG1 && console.log('https://backpack.tf/classifieds?steamid='+config.steamid+'&item='+urlname+'&quality='+lquality+'&craftable='+lcraftable+'&australium='+laustralium+'&killstreak_tier='+lkillstreak);
    var options = {
        url: 'https://backpack.tf/classifieds?steamid='+config.steamid+'&item='+urlname+'&quality='+lquality+'&craftable='+lcraftable+'&australium='+laustralium+'&killstreak_tier='+lkillstreak,
        method: 'GET',
        headers: cookieheader
    };

    function callback(err, resp, html) {
        if (!err) {
            $ = cheerio.load(html);
            if ($('[data-listing_intent=0]').eq(0).parent().parent().parent().parent().attr('id')!=undefined){
            var newBuyOrder=$('[data-listing_intent=0]').eq(0).parent().parent().parent().parent().attr('id').replace('listing-', '');
            DEBUG1 && console.log("Listing found to delete: "+ newBuyOrder);
            var listingId=listings[itemIndex].listing_ids.buy;
            var headers2 = {
                'content-type': 'application/json',
            };

            var data2= '{"listing_ids": [ "'+newBuyOrder+'" ] }';

            var options2 = {
                url: 'https://backpack.tf/api/classifieds/delete/v1?token='+config.token+'',
                method: 'DELETE',
                headers: headers2,
                body: data2
            };

            function callback2(error, response, body) {
                DEBUG1 && console.log(body);
                listings[itemIndex].listing_ids.buy=null;
                return asyncCallback(null);
            }
            request(options2, callback2);
            //DEBUG1 && console.log(body);
            //DEBUG1 && console.log(response);
            }
            else{
            	console.log("no buy listing found");
            	return asyncCallback(null);
            }
        }
        else{
        	return asyncCallback(null);
            DEBUG1 && console.log("err findlisting" + err);
            //DEBUG1 && console.log(body);
            //DEBUG1 && console.log(response);
        }
    }

    cloudscraper.request(options, callback);
};

exports.deleteSellListingCallback=function (itemIndex, needed, asyncCallback){
    if (listings[itemIndex].inventory.length>0){
        var listingIdz=listings[itemIndex].inventory;
        var headers = {
            'content-type': 'application/json',
        };

        var data= '{"listing_ids": '+JSON.stringify(listingIdz.map(i => '440_'+i))+' }';

        var options = {
            url: 'https://backpack.tf/api/classifieds/delete/v1?token='+config.token+'',
            method: 'DELETE',
            headers: headers,
            body: data
        };

        function callback(error, response, body) {
            DEBUG1 && console.log(body);
            listings[itemIndex].listing_ids.sell=null;
            return asyncCallback(null);
        }

        request(options, callback);
    }
    else{
        return asyncCallback(null);
    }
};




exports.deleteBuyListing=function (itemIndex){
    var listingId=listings[itemIndex].listing_ids.buy;
    var headers = {
        'content-type': 'application/json',
    };

    var data= '{"listing_ids": [ "'+listingId+'" ] }';

    var options = {
        url: 'https://backpack.tf/api/classifieds/delete/v1?token='+config.token+'',
        method: 'DELETE',
        headers: headers,
        body: data
    };

    function callback(error, response, body) {
        DEBUG1 && console.log(body);
        listings[itemIndex].listing_ids.buy=null;
    }

    request(options, callback);
};
exports.deleteSellListing=function (itemIndex){
    var listingIdz=listings[itemIndex].listing_ids.sell;
    var headers = {
        'content-type': 'application/json',
    };

    var data= '{"listing_ids": [ "'+listingIdz+'" ] }';

    var options = {
        url: 'https://backpack.tf/api/classifieds/delete/v1?token='+config.token+'',
        method: 'DELETE',
        headers: headers,
        body: data
    };

    function callback(error, response, body) {
        DEBUG1 && console.log(body);
        listings[itemIndex].listing_ids.sell=null;
    }

    request(options, callback);
};

exports.heartbeat=function(){
	var cookieheader={
    'cookie': 'stack[hash]='+config.hash+'; stack[user]='+config.steamid+'; __utmt=1',
    'accept-language': 'en-US,en;q=0.9',
    'upgrade-insecure-requests': '1',
    'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/62.0.3202.94 Safari/537.36',
    'accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
    'cache-control': 'max-age=0',
    'authority': 'ssl.google-analytics.com',
	'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/62.0.3202.94 Safari/537.36',
	'Origin': 'https://backpack.tf'
    };
    var options = {
        url: 'https://backpack.tf/api/IAutomatic/IHeartBeat?&version=1.3.3&i_understand_the_risks=true&method=alive&steamid='+config.steamid+'&token='+config.token+'&buy_orders=true',
        method: 'POST',
        headers: cookieheader
    };

    function callback(error, response, body) {
    	console.log(body);
    	if (body.includes('"success":1')){
      	  console.log("success sending heartbeat");
        }
        else{
        	console.log("unsuccessful heartbeat");
        }
    }

    request(options, callback);
};
//exports.heartbeat();
/* cases:
sell someone something --> no longer in inv (we dont care)//
sell someone something --> maxstock is no longer an issue//
sell someone something --> we want to list the next item if it was the listed one//

buy something --> create sell order if one is not already there//
remove buy order if maxstock//

*/


