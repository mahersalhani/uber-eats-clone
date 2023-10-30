import { createContext, useContext, useState, useEffect } from "react";
import { DataStore } from "aws-amplify";
import { Order, OrderDish, Basket } from "../models";
import { useAuthContext } from "./AuthContext";
import { useBasketContext } from "./BasketContext";

const OrderContext = createContext({});

const OrderContextProvider = ({ children }) => {
  const { dbUser } = useAuthContext();
  const { restaurant, totalPrice, basketDishes, basket } = useBasketContext();

  const [orders, setOrders] = useState([]);

  useEffect(() => {
    DataStore.query(Order, (o) => o.userID?.eq(dbUser?.id))
      .then(async (orders) => {
        const filteredOrders = orders.filter((order) => !order._deleted);

        const ordersWithRestaurant = await Promise.all(
          filteredOrders.map(async (order) => {
            const Restaurant = await order.Restaurant;
            return {
              ...order,
              Restaurant,
            };
          })
        );

        setOrders(ordersWithRestaurant);
      })
      .catch((e) => console.log("Error Order", e));
  }, [dbUser]);

  const createOrder = async () => {
    // create the order
    const newOrder = await DataStore.save(
      new Order({
        userID: dbUser?.id,
        Restaurant: restaurant,
        status: "NEW",
        total: totalPrice,
      })
    );

    // add all basketDishes to the order
    await Promise.all(
      basketDishes.map((basketDish) =>
        DataStore.save(
          new OrderDish({
            quantity: basketDish.quantity,
            orderID: newOrder?.id,
            Dish: basketDishes[0].Dish,
          })
        )
      )
    );

    // delete basket
    await DataStore.delete(basket);
    setOrders([...orders, newOrder]);
  };

  const getOrder = async (id) => {
    // const order = await DataStore.query(Order, (o) => o.id?.eq(id));
    const order = await DataStore.query(Order, id);
    console.log("id", id);

    const Restaurant = await order.Restaurant;

    const orderDishes = await DataStore.query(OrderDish, (od) =>
      od.orderID?.eq(id)
    ).catch((e) => console.log(e));

    // det the Dish for each orderDish
    const orderDishesWithDish = await Promise.all(
      orderDishes.map(async (orderDish) => {
        const Dish = await orderDish.Dish;

        return {
          ...orderDish,
          Dish,
        };
      })
    );

    return {
      ...order,
      Restaurant,
      dishes: orderDishesWithDish,
    };
  };

  return (
    <OrderContext.Provider value={{ createOrder, orders, getOrder }}>
      {children}
    </OrderContext.Provider>
  );
};

export default OrderContextProvider;

export const useOrderContext = () => useContext(OrderContext);
