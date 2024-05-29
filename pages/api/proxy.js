export default async function handler(req, res) {
  if (req.method === 'POST') {
    const { keyword, categories, subcategories } = req.body;

    try {
      // Make multiple API calls in parallel using Promise.all
      const responses = await Promise.all(categories.map((category, index) => {
        return fetch(`https://catalog.roblox.com/v1/search/items/details?Keyword=${keyword}&Category=${category}&Subcategory=${subcategories[index]}`);
      }));

      // Parse all responses as JSON
      const data = await Promise.all(responses.map(response => response.json()));

      const result = data.map(item => item.data).slice(0, 4);
      

      res.status(200).json(result);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Internal Server Error' });
    }
  } else {
    res.status(405).json({ message: 'Method Not Allowed' });
  }
}