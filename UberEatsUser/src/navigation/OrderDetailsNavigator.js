import { createMaterialTopTabNavigator } from "@react-navigation/material-top-tabs";
import OrderDetails from "../screens/OrderDetails";
import OrderLiveUpdates from "../screens/OrderLiveUpdates";
import OrderCompleted from "../components/OrderCompleted";

const Tab = createMaterialTopTabNavigator();

const OrderDetailsNavigator = ({ route }) => {
  const id = route?.params?.id;
  const status = route?.params?.status;

  if (!id) return null;

  return (
    <Tab.Navigator>
      <Tab.Screen name="Details">{() => <OrderDetails id={id} />}</Tab.Screen>

      <Tab.Screen name="Updates">
        {() => (
          <>
            {status === "COMPLETED" ? (
              <OrderCompleted />
            ) : (
              <OrderLiveUpdates id={id} />
            )}
          </>
        )}
      </Tab.Screen>
    </Tab.Navigator>
  );
};

export default OrderDetailsNavigator;
