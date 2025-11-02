import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuth } from '../context/AuthContext';
import Icon from 'react-native-vector-icons/Ionicons';
import { COLORS } from '../utils/constants';

// Auth Screens
import SplashScreen from '../screens/auth/SplashScreen';
import LoginScreen from '../screens/auth/LoginScreen';
import SignupScreen from '../screens/auth/SignupScreen';

// Client Screens
import HomeScreen from '../screens/client/HomeScreen';
import CreateJobScreen from '../screens/client/CreateJobScreen';
import ProposalsScreen from '../screens/client/ProposalsScreen';
import MyJobsClientScreen from '../screens/client/MyJobsClientScreen';
import PaymentScreen from '../screens/client/PaymentScreen'; // Caminho Corrigido

// Videomaker Screens
import FeedScreen from '../screens/videomaker/FeedScreen';
import MyJobsScreen from '../screens/videomaker/MyJobsScreen';
import PortfolioScreen from '../screens/videomaker/PortfolioScreen';
import JobDetailsScreen from '../screens/videomaker/JobDetailsScreen'; // Caminho Corrigido

// Common Screens
import ChatListScreen from '../screens/common/ChatListScreen';
import ChatScreen from '../screens/common/ChatScreen';
import ProfileScreen from '../screens/common/ProfileScreen';
import EditProfileScreen from '../screens/common/EditProfileScreen';
import RatingScreen from '../screens/common/RatingScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

const ClientTabs = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      tabBarIcon: ({ focused, color, size }) => {
        let iconName;
        if (route.name === 'Home') iconName = focused ? 'home' : 'home-outline';
        else if (route.name === 'MyJobsClient') iconName = focused ? 'briefcase' : 'briefcase-outline';
        else if (route.name === 'CreateJob') iconName = focused ? 'add-circle' : 'add-circle-outline';
        else if (route.name === 'ChatList') iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
        else if (route.name === 'Profile') iconName = focused ? 'person' : 'person-outline';
        
        return <Icon name={iconName} size={size} color={color} />;
      },
      tabBarActiveTintColor: COLORS.primary,
      tabBarInactiveTintColor: COLORS.gray[400],
      headerShown: false,
    })}
  >
    <Tab.Screen 
      name="Home" 
      component={HomeScreen} 
      options={{ tabBarLabel: 'Início' }}
    />
    <Tab.Screen 
      name="MyJobsClient" 
      component={MyJobsClientScreen} 
      options={{ tabBarLabel: 'Meus Jobs' }}
    />
    <Tab.Screen 
      name="CreateJob" 
      component={CreateJobScreen} 
      options={{ tabBarLabel: 'Novo Job' }}
    />
    <Tab.Screen 
      name="ChatList" 
      component={ChatListScreen} 
      options={{ tabBarLabel: 'Chat' }}
    />
    <Tab.Screen 
      name="Profile" 
      component={ProfileScreen} 
      options={{ tabBarLabel: 'Perfil' }}
    />
  </Tab.Navigator>
);

const VideomakerTabs = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      tabBarIcon: ({ focused, color, size }) => {
        let iconName;
        if (route.name === 'Feed') iconName = focused ? 'list' : 'list-outline';
        else if (route.name === 'MyJobs') iconName = focused ? 'briefcase' : 'briefcase-outline';
        else if (route.name === 'ChatList') iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
        else if (route.name === 'Profile') iconName = focused ? 'person' : 'person-outline';
        
        return <Icon name={iconName} size={size} color={color} />;
      },
      tabBarActiveTintColor: COLORS.primary,
      tabBarInactiveTintColor: COLORS.gray[400],
      headerShown: false,
    })}
  >
    <Tab.Screen 
      name="Feed" 
      component={FeedScreen} 
      options={{ tabBarLabel: 'Jobs' }}
    />
    <Tab.Screen 
      name="MyJobs" 
      component={MyJobsScreen} 
      options={{ tabBarLabel: 'Meus Jobs' }}
    />
    <Tab.Screen 
      name="ChatList" 
      component={ChatListScreen} 
      options={{ tabBarLabel: 'Chat' }}
    />
    <Tab.Screen 
      name="Profile" 
      component={ProfileScreen} 
      options={{ tabBarLabel: 'Perfil' }}
    />
  </Tab.Navigator>
);

const AppNavigator = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return <SplashScreen />;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!user ? (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Signup" component={SignupScreen} />
          </>
        ) : (
          <>
            {user.role === 'client' ? (
              <Stack.Screen name="ClientApp" component={ClientTabs} />
            ) : (
              <Stack.Screen name="VideomakerApp" component={VideomakerTabs} />
            )}
            
            {/* Telas Comuns (Stack Principal) */}
            <Stack.Screen 
              name="Chat" 
              component={ChatScreen}
              options={{ headerShown: true, title: 'Chat' }}
            />
            <Stack.Screen 
              name="EditProfile" 
              component={EditProfileScreen}
              options={{ headerShown: true, title: 'Editar Perfil' }}
            />
            <Stack.Screen 
              name="JobDetails" 
              component={JobDetailsScreen}
              options={{ headerShown: true, title: 'Detalhes do Job' }}
            />
            <Stack.Screen 
              name="Proposals" 
              component={ProposalsScreen}
              options={{ headerShown: true, title: 'Propostas' }}
            />
            <Stack.Screen 
              name="Portfolio" 
              component={PortfolioScreen}
              options={{ headerShown: true, title: 'Portfólio' }}
            />
            <Stack.Screen 
              name="Payment" 
              component={PaymentScreen}
              options={{ headerShown: true, title: 'Pagamento' }}
            />
            <Stack.Screen 
              name="Rating" 
              component={RatingScreen}
              options={{ headerShown: true, title: 'Avaliar' }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
