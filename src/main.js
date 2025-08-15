/**
 * Функция для расчета выручки
 * @param purchase запись о покупке
 * @param _product карточка товара
 * @returns {number}
 */
function calculateSimpleRevenue(purchase, _product) {
  const discount = 1 - (purchase.discount / 100);
  return purchase.sale_price * purchase.quantity * discount;
}

/**
 * Функция для расчета бонусов
 * @param index порядковый номер в отсортированном массиве
 * @param total общее число продавцов
 * @param seller карточка продавца
 * @returns {number}
 */
function calculateBonusByProfit(index, total, seller) {
  const {profit} = seller;
  if (index === 0) {
    return +(profit * 0.15).toFixed(2);
  } else if (index === 1 || index === 2) {
    return +(profit * 0.10).toFixed(2);
  } else if (index === total - 1) {
    return 0;
  } else {
    return +(profit * 0.05).toFixed(2);
  }
}

/**
 * Функция для анализа данных продаж
 * @param data
 * @param options
 * @returns {{revenue, top_products, bonus, name, sales_count, profit, seller_id}[]}
 */
function analyzeSalesData(data, options) {
  if (!data || !Array.isArray(data.sellers) || data.sellers.length === 0) {
    throw new Error('Некорректные входные данные');
  }
  const {calculateRevenue, calculateBonus} = options;
  if (!typeof calculateRevenue === "function" || !typeof calculateBonus === "function") {
    throw new Error('Чего-то не хватает');
  }
  const sellerStats = data.sellers.map(seller => ({
    id: seller.id,
    name: `${seller.first_name} ${seller.last_name}`,
    revenue: 0,
    profit: 0,
    sales_count: 0,
    products_sold: {}
  }));
  const sellerIndex = Object.fromEntries(data.sellers.map(item => [item.id, item]));
  const productIndex = Object.fromEntries(data.products.map(item => [item.sku, item]));
  data.purchase_records.forEach(record => {
    const seller = sellerIndex[record.seller_id];
    sellerStats.map(item => {
      if (item.id === seller.id) {
        item.sales_count++;
        item.revenue += record.total_amount;
      }
    })

    record.items.forEach(item => {
      const product = productIndex[item.sku];
      const cost = product.purchase_price * item.quantity;
      const revenue = calculateRevenue(item);
      sellerStats.map(value => {
        if (value.id === seller.id) {
          value.profit += revenue - cost;
          if (!value.products_sold[item.sku]) {
            value.products_sold[item.sku] = 0;
          }
          value.products_sold[item.sku] += item.quantity;
        }
      })
    });
  });

  sellerStats.sort((a, b) => (a.profit - b.profit) * -1);

  sellerStats.forEach((seller, index, arr) => {
    seller.bonus = calculateBonus(index, arr.length, seller);
    seller.top_products = Object.entries(seller.products_sold)
      .sort((a, b) => b[1] - a[1])
      .filter((item, index) => index < 10)
      .flatMap(item => {
        return {sku: item[0], quantity: item[1]}
      });
  })

  return sellerStats.map(seller => ({
    seller_id: seller.id,
    name: seller.name,
    revenue: +seller.revenue.toFixed(2),
    profit: +seller.profit.toFixed(2),
    sales_count: seller.sales_count,
    top_products: seller.top_products,
    bonus: seller.bonus,
  }));

}
