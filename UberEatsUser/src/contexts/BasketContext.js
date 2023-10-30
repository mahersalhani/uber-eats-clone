import { createContext, useState, useEffect, useContext } from "react";
import { DataStore } from "aws-amplify";
import { Basket, BasketDish, Dish, BasketDishDish } from "../models";
import { useAuthContext } from "./AuthContext";

const BasketContext = createContext({});

const BasketContextProvider = ({ children }) => {
  const { dbUser } = useAuthContext();

  const [restaurant, setRestaurant] = useState(null);
  const [basket, setBasket] = useState(null);
  const [basketDishes, setBasketDishes] = useState([]);

  const totalPrice = basketDishes.reduce(
    (sum, basketDish) => sum + basketDish.quantity * basketDish.Dish?.price,
    restaurant?.deliveryFee
  );

  useEffect(() => {
    DataStore.query(Basket, (b) =>
      b.and((b) => [
        b.userID?.eq(dbUser?.id),
        b.restaurantID?.eq(restaurant?.id),
      ])
    )
      .then((baskets) => setBasket(baskets[0]))
      .catch((e) => console.log("Error", e));
  }, [dbUser, restaurant]);

  const queryBasket = async () => {
    const basketDishes = await DataStore.query(BasketDish, (bd) =>
      bd.basketID.eq(basket?.id)
    );

    const data = await Promise.all(
      basketDishes.map(async (basketDish) => {
        const dishes = await basketDish.Dishes.toArray();
        const dish = await dishes[0].dish;
        return { ...basketDish, Dish: dish };
      })
    );

    setBasketDishes(data);
  };

  useEffect(() => {
    if (basket) {
      queryBasket();
    }
  }, [basket]);

  const addDishToBasket = async (dish, quantity) => {
    // get the existing basket or create a new one
    let theBasket = basket || (await createNewBasket());

    // create a BasketDish item and save to Datastore
    const newDish = await DataStore.save(
      new BasketDish({ quantity, basketID: theBasket.id })
    );

    await DataStore.save(
      new BasketDishDish({
        basketDish: newDish,
        dish: dish,
      })
    );

    setBasketDishes([...basketDishes, newDish]);
  };

  const createNewBasket = async () => {
    const newBasket = await DataStore.save(
      new Basket({ userID: dbUser?.id, restaurantID: restaurant?.id })
    );
    setBasket(newBasket);
    return newBasket;
  };

  return (
    <BasketContext.Provider
      value={{
        addDishToBasket,
        setRestaurant,
        restaurant,
        basket,
        basketDishes,
        totalPrice,
      }}
    >
      {children}
    </BasketContext.Provider>
  );
};

export default BasketContextProvider;

export const useBasketContext = () => useContext(BasketContext);
