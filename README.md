# tf2-autoprice-bot
Automatically buys and sells tf2 items while listing on backpack.tf. The bot has the following features:

- automatically undercuts other sellers on backpack.tf and overcuts on buy orders
- automatically accepts offers and handles confirmations
- creates and removes listings on backpack.tf automatically
- maxstock
- auto-flips items (i.e. it sells an item immediately after it is bought)
- checks SR bans
- calculates profit and logs items sold
# Table of Contents

* [config.json](#config)
* [listings.json](#listings)
* [setup.js](#setup.js)

# Setup and configuration
Begin by downloading the repository. You can do this by downloading as a zip. Make sure to keep everything in a single folder.

The next step is to install dependencies. To do this use
>npm install


## <a name="config"></a>config.json
config.json is where login details are stored for the bot. The paramaters are as follows:

- `steamid` - the steamID64 of the bot, i.e. 765611xxxxxxxxxx
- `admin` - the steamID64 for the admin of the bot. Any trade the admin sends will be accepted, and the are certain chat commands to control the bot.
 - `hash` - the bots backpack.tf stack[hash] cookie. You can get this by logging into backpack.tf, and then viewing all cookies. Stack[hash] is needed so that we can find the ids of hidden listings, which are not viewable without being logged in. It is also the way heartbeats are sent (there are other alternatives, but this is much easier)
- `token` - the bots backpack.tf [token](https://backpack.tf/connections)
- `key` - the bots backpack.tf [API Key](https://backpack.tf/developer/apikey/view) (THIS IS NOT THE SAME AS THE TOKEN)
- `identity_secret` - the identity_secret for the bot. This is used to auto-accept confirmations.
- `shared_secret` - the shared for the bot. Necessary for logins, because the bot periodically logs off and back on to reduce some errors, such as escrow days not being returned.
- `username` - the bots steam login username
- `password` - the bots steam login password
- `name` - the display name of the bot. This is used so that the bot does not undercut itself.


## <a name="listings"></a>listings.json
Listings.json is the bread and butter of this program, and it controls which items are banked.

- `def_index` - the tf2 defindex of the item you want to bank
- `quality` - the numeric quality ID for the item you want to bank. Currently only unique, strange, genuine, vintage, and haunted items are supported. I.e., 6= unique
 - `uncraft` - either `true` or `false`, true if you want the uncraftable variant of the item
- `killstreak` - either `0`,`-1`,`2`,or `3`. 0 accepts any killstreak, -1 is no killstreak. 1 is standard killstreak, 2 is specialized killstreak, 3 is professional killstreak. 
- `buyprice` - separated into key and ref paramaters, the price the bot buys the item at.
-  `sellprice` - same as buyprice except the sellprice.
- `maxstock` - maximum stock for this item. After the stock is reached the listing will be removed from backpack.tf
- `url` - the url linking to the stats page of the item you want to bank. If you put this in wrong bad things will happen, as this is the url used in undercutting.
- `listing_ids` where the bot stores the backpack.tf listing IDs for things.
- `inventory` - the bot will put the item IDs that match the criteria in an array here automatically. You do not need to edit this.
- `bought` - The bot automatically records the item IDs of items you have previously bought, and the price in keys in this parameter.
- `sold` - Same as bought, except for item sales. 

I have pre-included a list of around 1000 items that I previously hand-picked to bank.
## <a name="setup.js"></a>setup.js
run this BEFORE you run the bot with
>node setup.js

This populates the inventory in listings.json, and sets all buy/sell IDs to null
