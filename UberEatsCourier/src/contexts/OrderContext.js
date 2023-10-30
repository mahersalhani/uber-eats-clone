import { createContext, useEffect, useState, useContext } from "react";
import { DataStore } from "aws-amplify";
import { Order, User, OrderDish } from "../models";
import { useAuthContext } from "./AuthContext";

const OrderContext = createContext({});

const OrderContextProvider = ({ children }) => {
  const { dbCourier } = useAuthContext();
  const [order, setOrder] = useState();
  const [user, setUser] = useState();
  const [dishes, setDishes] = useState();

  const fetchOrder = async (id) => {
    if (!id) {
      setOrder(null);
      return;
    }
    const fetchedOrder = await DataStore.query(Order, id);
    const restaurant = await fetchedOrder.Restaurant;

    setOrder({
      ...fetchedOrder,
      Restaurant: restaurant,
    });

    DataStore.query(User, fetchedOrder.userID).then(setUser);

    DataStore.query(OrderDish, (od) => od.orderID.eq(fetchedOrder.id)).then(
      async (orderDishes) => {
        const orderDishesWithDish = await Promise.all(
          orderDishes.map(async (orderDish) => {
            const dish = await orderDish.Dish;

            return {
              ...orderDish,
              Dish: dish,
            };
          })
        );

        setDishes(orderDishesWithDish);
      }
    );
  };

  useEffect(() => {
    if (!order) {
      return;
    }

    const subscription = DataStore.observe(Order, order.id).subscribe(
      ({ opType, element }) => {
        if (opType === "UPDATE") {
          console.log("OrderContextProvider.js: 1: opType: ", opType);

          fetchOrder(element.id);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [order?.id]);

  const acceptOrder = async () => {
    const originalOrder = await DataStore.query(Order, order.id);

    // update the order, and change status, and assign the courier
    const updatedOrder = await DataStore.save(
      Order.copyOf(originalOrder, (updated) => {
        updated.status = "ACCEPTED";
        updated.Courier = dbCourier;
      })
    );

    const restaurant = await updatedOrder.Restaurant;

    setOrder({
      ...updatedOrder,
      Restaurant: restaurant,
    });
  };

  const pickUpOrder = async () => {
    const originalOrder = await DataStore.query(Order, order.id);

    const updatedOrder = await DataStore.save(
      Order.copyOf(originalOrder, (updated) => {
        updated.status = "PICKED_UP";
      })
    );

    const restaurant = await updatedOrder.Restaurant;

    setOrder({
      ...updatedOrder,
      Restaurant: restaurant,
    });
  };

  const completeOrder = async () => {
    const originalOrder = await DataStore.query(Order, order.id);

    const updatedOrder = await DataStore.save(
      Order.copyOf(originalOrder, (updated) => {
        updated.status = "COMPLETED";
      })
    );

    const restaurant = await updatedOrder.Restaurant;

    setOrder({
      ...updatedOrder,
      Restaurant: restaurant,
    });
  };

  return (
    <OrderContext.Provider
      value={{
        acceptOrder,
        order,
        user,
        dishes,
        fetchOrder,
        pickUpOrder,
        completeOrder,
      }}
    >
      {children}
    </OrderContext.Provider>
  );
};

export default OrderContextProvider;

export const useOrderContext = () => useContext(OrderContext);
