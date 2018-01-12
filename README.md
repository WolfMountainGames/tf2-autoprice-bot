# tf2-autoprice-bot
Automatically buys and sells tf2 items while listing on backpack.tf.

# Table of Contents

* [Setup and configuration](#config)

# <a name="config"></a>Setup and configuration
Begin by downloading the repository. You can do this by downloading as a zip. Make sure to keep everything in a single folder.

The next step is to install dependencies. To do this use
>npm install


## config.json
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



