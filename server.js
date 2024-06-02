require('dotenv').config();

const ROBLOX_API_ENDPOINT = process.env.ROBLOX_API_ENDPOINT;
const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;
const TOKEN = process.env.TOKEN;
const COOKIE = process.env.COOKIE;

const { default: next } = require('next');
const images = require('./images');


(async () => {
    const fetch = (await import('node-fetch')).default;
    const { Client, GatewayIntentBits, WebhookClient } = require('discord.js');
    const { EmbedBuilder } = await import('@discordjs/builders');
    const fs = require('fs');

    const getTotalSales = (itemName, today) => {
        const salesData = getSalesData();
        const sales = salesData.filter((sale) => {
            return sale.details && sale.details.name === itemName;
        });
        if (today) {
            const todayDate = new Date().toDateString();
            return sales.filter(sale => new Date(sale.created).toDateString() === todayDate).length;
        }
        return sales.length + 1;
    }

    const sendTransactionToDiscord = (transaction) => {
        const user = transaction.agent.name.toString();
        const itemName = transaction.details.name.toString();
        const profit = transaction.currency.amount.toString() + " R$";
        console.log('Transaction:', itemName + " sold for " + profit);

        const embed = new EmbedBuilder()
        .setTitle(itemName)
        .addFields(
            { name: 'Sold Today', value: getTotalSales(itemName, true).toString(), inline: true},
            { name: 'Items Sold', value: getTotalSales(itemName).toString(), inline: true},
            { name: 'Profit', value: profit, inline: true },
            { name: 'Buyer', value: user, inline: true },
        )
        .setImage(
            images[itemName]
        );
            
        webhookClient.send({
            embeds: [embed],
        }).then(() => {
            console.log('Successfully sent data to Discord');
            sortSalesData(transaction);
        }).catch((error) => {
            console.error('Discord error:', error);
        });  
    }

    const logAllSales = async (data) => {
        for (let i = 0; i < data.length; i++) {
            fs.appendFile('sales.txt', JSON.stringify(data[i]) + '\n', (err) => {
                if (err) throw err;
            });
        }
    }

    const goThroughPages = async () => {
        let hasNextPage = true;
        let ROBLOX_API_ENDPOINT2 = `https://economy.roblox.com/v2/groups/33003599/transactions?limit=100&sortOrder=Asc&transactionType=Sale`;
        
        while (hasNextPage) {
            console.log(ROBLOX_API_ENDPOINT2)
            const response = await fetch(ROBLOX_API_ENDPOINT2, {
                headers: {
                    'Cookie': COOKIE
                }
            });
            if (!response.ok) {
                console.error('Error fetching data:', response.statusText);
                return;
            }
    
            const data = await response.json();
            if (!data || !data.data || data.data.length === 0) {
                console.log('Empty data');
                return;
            }
            
            logAllSales(data.data);
            let nextPageCursor = data.nextPageCursor;
            ROBLOX_API_ENDPOINT2 = `https://economy.roblox.com/v2/groups/33003599/transactions?limit=100&sortOrder=Asc&transactionType=Sale&cursor=${nextPageCursor}`;
            hasNextPage = nextPageCursor !== null && nextPageCursor !== undefined;
        }
    }

    const getSalesData = () => {
        const salesData = fs.readFileSync('sales.txt', 'utf8');
        const sales = salesData.split('\n').filter(line => line.trim() !== '').map(line => JSON.parse(line));
        return sales;
    }

    const sortSalesData = (transaction) => {
        fs.appendFile('sales.txt', '\n' + JSON.stringify(transaction) + '\n', (err) => {
            if (err) throw err;
            const sortedData = getSalesData().sort((a, b) => a.created - b.created);
            fs.writeFileSync('sales.txt', sortedData.map(sale => JSON.stringify(sale)).join('\n'));
        });
    
    }
   
    const getMissingData = (apiData) => {
        const salesHashes = new Set(getSalesData().map(sale => sale.idHash));
        const missingData = apiData.filter(item => !salesHashes.has(item.idHash));
        return missingData;
    }

    const refresh = (apiData) => {
        const missingData = getMissingData(apiData);
        if (missingData.length === 0) {
            console.log('No new data');
            return;
        }
        for (let i = 0; i < missingData.length; i++) {
            sendTransactionToDiscord(missingData[i]);
        }
    }
    
    // Create a new client instance
    const client = new Client({ intents: [GatewayIntentBits.Guilds] });

    // When the client is ready, run this code (only once).
    client.once('ready', readyClient => {
        console.log(`Ready! Logged in as ${readyClient.user.tag}`);
    });

    // Log in to Discord with client's token
    client.login(TOKEN);

    const webhookClient = new WebhookClient({ url: DISCORD_WEBHOOK_URL });
   
    async function fetchTransactions() {
      try {
        const response = await fetch(ROBLOX_API_ENDPOINT, {
            headers: {
              'Cookie': COOKIE
            }
          });
        const data = await response.json();
        if (!data || !data.data || data.data.length === 0) {
          console.log('Empty data');
          return;
        }
        try {
            //goThroughPages();
            refresh(data.data);
        } catch (error) {
            console.error('error reading sales.txt:', error);
        }
      } catch (error) {
        console.error('other error:', error);
      }
    }
  
    // Fetch and process every 60 seconds
    setInterval(fetchTransactions, 60000);
  
    fetchTransactions();
  })();
  