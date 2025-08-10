Steps to setup project:

After checkout(develop branch) goto ./storefront-reference-architecture and ./rocketbox, create dw.json inside both folders with following json content:
{
    "hostname": "zyaj-xxx.sandbox.us01.dx.commercecloud.salesforce.com",
    "username": "xxxx@changecx.com",
    "password": "xxxxxxx",
    "code-version": "sfra_version1"
}

Goto command prompt or terminal, inside each directory, run npm install to install dependencies.

Once done with dependencies, goto ./storefront-reference-architecture in Terminal or Command Prompt and run commands as "npm run compile:scss", "npm run compile:js", "npm run compile:fonts" and finally "npm run uploadCartridge".

Goto inside ./rocketbox and run commands as "npm run compile:scss", "npm run compile:js" and finally "npm run watch" to start your work.

Note: do not change content of ./storefront-reference-architecture
