const { Actor } = require('apify');
const { PlaywrightCrawler } = require('crawlee');

Actor.main(async () => {
    const input = await Actor.getInput();
    const { productUrls = [], maxItems = 10 } = input;

    console.log('Starting Amazon Price Tracker...');

    if (!productUrls.length) {
        throw new Error('Please provide at least one Amazon product URL');
    }

    const crawler = new PlaywrightCrawler({
        maxRequestsPerCrawl: maxItems,
        requestHandler: async ({ request, page }) => {
            const url = request.url;
            console.log(`Scraping: ${url}`);
            
            try {
                await page.waitForLoadState('networkidle');
                
                const productData = await page.evaluate(() => {
                    const titleSelectors = ['#productTitle', 'h1.a-size-large'];
                    let title = 'Title not found';
                    for (const selector of titleSelectors) {
                        const element = document.querySelector(selector);
                        if (element && element.textContent.trim()) {
                            title = element.textContent.trim();
                            break;
                        }
                    }
                    
                    const priceSelectors = ['.a-price .a-offscreen', '.a-price-whole'];
                    let price = 'Price not found';
                    for (const selector of priceSelectors) {
                        const element = document.querySelector(selector);
                        if (element && element.textContent.trim()) {
                            price = element.textContent.trim();
                            break;
                        }
                    }
                    
                    const imageElement = document.querySelector('#landingImage, .a-dynamic-image');
                    const imageUrl = imageElement ? imageElement.src : null;
                    
                    const ratingElement = document.querySelector('.a-icon-alt');
                    const rating = ratingElement ? ratingElement.textContent.trim() : 'No rating';
                    
                    return {
                        title,
                        price,
                        imageUrl,
                        rating,
                        scrapedAt: new Date().toISOString()
                    };
                });
                
                productData.url = url;
                await Actor.pushData(productData);
                
                console.log(`Successfully scraped: ${productData.title} - ${productData.price}`);
                
            } catch (error) {
                console.error(`Error scraping ${url}:`, error.message);
                await Actor.pushData({
                    url,
                    title: 'Error occurred',
                    price: 'Could not retrieve',
                    error: error.message,
                    scrapedAt: new Date().toISOString()
                });
            }
        },
    });

    for (const url of productUrls.slice(0, maxItems)) {
        await crawler.addRequests([{ url }]);
    }

    await crawler.run();
    console.log('Amazon price tracking completed!');
});
