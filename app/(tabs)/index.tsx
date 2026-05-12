import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, ImageBackground, ScrollView } from 'react-native';
import { WDW_PARKS, fetchWaitTimes, RideWaitTime, Park } from '../../src/api';
import { usePlan } from '../../src/PlanContext';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';

const Colors = {
  primary: '#021541',
  secondaryContainer: '#fed65b',
  secondaryFixed: '#ffe088',
  secondaryFixedDim: '#e9c349',
  surface: '#f9f9f9',
  surfaceContainer: '#eeeeee',
  surfaceContainerLowest: '#ffffff',
  surfaceContainerHigh: '#e8e8e8',
  onSurface: '#1a1c1c',
  onSurfaceVariant: '#45464f',
  outline: '#757680',
  outlineVariant: '#c5c6d0',
  errorContainer: '#ffdad6',
  onErrorContainer: '#93000a',
  onPrimary: '#ffffff',
  primaryContainer: '#1a2b56',
  onPrimaryContainer: '#8393c5',
};

const LAND_COLORS = ['#00A3E0', '#D4AF37', '#4E3629', '#e8e8e8'];

export default function WaitTimesScreen() {
  const [selectedPark, setSelectedPark] = useState<Park>(WDW_PARKS[0]);
  const [waitTimes, setWaitTimes] = useState<RideWaitTime[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const { addRide, isPlanned, removeRide } = usePlan();
  const router = useRouter();

  useEffect(() => {
    loadWaitTimes();
  }, [selectedPark]);

  const loadWaitTimes = async () => {
    setLoading(true);
    const data = await fetchWaitTimes(selectedPark.id);
    setWaitTimes(data.sort((a, b) => a.name.localeCompare(b.name)));
    setLoading(false);
  };

  const getParkImage = (parkId: string) => {
    switch (parkId) {
      case '75ea578a-adc8-4116-a54d-dccb60765ef9': // MK
        return 'https://images.unsplash.com/photo-1590856029826-c7a73142bbf1?q=80&w=2073&auto=format&fit=crop';
      case '47f90d2c-e191-4239-a466-5892ef59a88b': // Epcot
        return 'https://images.unsplash.com/photo-1605330364121-6548a3cc0286?q=80&w=1974&auto=format&fit=crop';
      default:
        return 'https://images.unsplash.com/photo-1590856029826-c7a73142bbf1?q=80&w=2073&auto=format&fit=crop';
    }
  };

  const renderWaitTime = ({ item, index }: { item: RideWaitTime, index: number }) => {
    const planned = isPlanned(item.id);
    const isOperating = item.status === 'OPERATING';
    const waitTime = item.queue?.STANDBY?.waitTime || 0;
    
    // Pseudo-random land color based on index
    const accentColor = LAND_COLORS[index % LAND_COLORS.length];
    
    // Determine wait time box color
    const waitBoxStyle = waitTime > 60 
      ? { backgroundColor: Colors.errorContainer, color: Colors.onErrorContainer }
      : { backgroundColor: Colors.surfaceContainerHigh, color: Colors.primary };

    return (
      <TouchableOpacity 
        style={[styles.rideCard, { borderLeftColor: accentColor }]}
        onPress={() => router.push({ pathname: '/ride/[id]', params: { id: item.id, name: item.name, waitTime: waitTime.toString(), status: item.status } })}
      >
        <View style={styles.rideCardHeader}>
          <View style={{ flex: 1, paddingRight: 10 }}>
            <Text style={styles.rideName}>{item.name}</Text>
            <Text style={styles.rideLand}>{isOperating ? 'Standby Queue' : item.status}</Text>
          </View>
          {isOperating && (
            <View style={[styles.waitTimeBox, { backgroundColor: waitBoxStyle.backgroundColor }]}>
              <Text style={[styles.waitTimeNumber, { color: waitBoxStyle.color }]}>{waitTime}</Text>
              <Text style={[styles.waitTimeLabel, { color: waitBoxStyle.color }]}>MIN</Text>
            </View>
          )}
        </View>

        {/* Decorative mini bar chart (static visual placeholder as per design) */}
        {isOperating && (
          <View style={styles.miniChartContainer}>
             <View style={[styles.miniBar, { height: '40%', backgroundColor: '#dae1ff' }]} />
             <View style={[styles.miniBar, { height: '55%', backgroundColor: '#dae1ff' }]} />
             <View style={[styles.miniBar, { height: '70%', backgroundColor: '#dae1ff' }]} />
             <View style={[styles.miniBar, { height: '90%', backgroundColor: Colors.secondaryContainer }]} />
             <View style={[styles.miniBar, { height: '60%', backgroundColor: '#dae1ff' }]} />
             <View style={[styles.miniBar, { height: '40%', backgroundColor: '#dae1ff' }]} />
          </View>
        )}

        <View style={styles.rideCardFooter}>
          <View style={styles.footerInfo}>
             <Ionicons name="sparkles" size={14} color="#469ec5" style={{ marginRight: 4 }} />
             <Text style={styles.footerText}>Tap to add to itinerary</Text>
          </View>
          <TouchableOpacity
            style={styles.planButton}
            onPress={(e) => { e.stopPropagation(); planned ? removeRide(item.id) : addRide(item); }}
          >
            <Ionicons 
              name={planned ? 'checkmark-circle' : 'add-circle'} 
              size={32} 
              color={planned ? '#34C759' : Colors.primary} 
            />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.parkSelector}>
        <FlatList
          horizontal
          data={WDW_PARKS}
          keyExtractor={(item) => item.id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.parkTab, selectedPark.id === item.id && styles.parkTabActive]}
              onPress={() => setSelectedPark(item)}
            >
              <Text style={[styles.parkTabText, selectedPark.id === item.id && styles.parkTabTextActive]}>
                {item.name.replace("Disney's ", "").replace(" Park", "").replace(" Theme Park", "")}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Hero Section */}
        <View style={styles.heroContainer}>
          <ImageBackground 
            source={{ uri: getParkImage(selectedPark.id) }} 
            style={styles.heroImage}
            imageStyle={{ borderRadius: 16 }}
          >
            <LinearGradient
              colors={['rgba(2, 21, 65, 0.8)', 'transparent']}
              start={{ x: 0, y: 1 }}
              end={{ x: 0, y: 0 }}
              style={styles.heroGradient}
            >
              <View>
                <Text style={styles.heroTitle}>{selectedPark.name.replace("Disney's ", "")}</Text>
                <View style={styles.heroScheduleRow}>
                  <Ionicons name="time-outline" size={16} color={Colors.secondaryFixedDim} />
                  <Text style={styles.heroScheduleText}>9AM - 11PM</Text>
                </View>
              </View>

              <View style={styles.heroStatsRow}>
                <View style={styles.heroStatBox}>
                  <Text style={styles.heroStatLabel}>Crowd Level</Text>
                  <Text style={styles.heroStatValue}>
                    8 <Text style={styles.heroStatSubValue}>/ 10</Text>
                  </Text>
                </View>
                <View style={styles.heroStatBox}>
                  <Text style={styles.heroStatLabel}>Early Entry</Text>
                  <Text style={[styles.heroStatValue, { fontSize: 20 }]}>8:30 AM</Text>
                </View>
              </View>
            </LinearGradient>
          </ImageBackground>
        </View>

        {/* CTA Card */}
        <View style={styles.ctaCard}>
          <Ionicons name="color-wand" size={100} color="rgba(255,255,255,0.05)" style={styles.ctaBgIcon} />
          <Text style={styles.ctaTitle}>Perfect Your Park Day</Text>
          <Text style={styles.ctaBody}>Our expert AI optimizes your route based on real-time crowd flow and wait-time predictions.</Text>
          
          <LinearGradient
             colors={[Colors.secondaryContainer, Colors.secondaryFixed]}
             start={{ x: 0, y: 0 }}
             end={{ x: 1, y: 0 }}
             style={styles.ctaButton}
          >
            <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={styles.ctaButtonText}>Start Planning</Text>
              <Ionicons name="sparkles" size={16} color={Colors.primary} style={{ marginLeft: 4 }} />
            </TouchableOpacity>
          </LinearGradient>
        </View>

        {/* List Header */}
        <View style={styles.listHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="trending-up" size={20} color={Colors.secondaryContainer} style={{ marginRight: 8 }} />
            <Text style={styles.listTitle}>Featured Wait Times</Text>
          </View>
          <Text style={styles.listSubtitle}>Updated: Just Now</Text>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 50 }} />
        ) : (
          <View style={styles.ridesContainer}>
            {waitTimes.map((item, index) => (
              <React.Fragment key={item.id}>
                {renderWaitTime({ item, index })}
              </React.Fragment>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  parkSelector: {
    backgroundColor: Colors.surfaceContainerLowest,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.outlineVariant + '40', // 40 is hex for 25% opacity approx
  },
  parkTab: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 8,
    borderRadius: 24,
    backgroundColor: Colors.surfaceContainer,
  },
  parkTabActive: {
    backgroundColor: Colors.primaryContainer,
  },
  parkTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.onSurfaceVariant,
  },
  parkTabTextActive: {
    color: Colors.onPrimaryContainer,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100, // Room for bottom nav
  },
  heroContainer: {
    height: 240,
    borderRadius: 16,
    marginBottom: 24,
    shadowColor: '#d4af37',
    shadowOpacity: 0.2,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
  heroImage: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
  },
  heroGradient: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    justifyContent: 'space-between',
    flexDirection: 'column-reverse', // Put content at bottom
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.onPrimary,
    fontFamily: 'Georgia',
    marginBottom: 4,
  },
  heroScheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  heroScheduleText: {
    color: Colors.onPrimary,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
    marginLeft: 4,
  },
  heroStatsRow: {
    flexDirection: 'row',
    gap: 16,
  },
  heroStatBox: {
    flex: 1,
    backgroundColor: 'rgba(2, 21, 65, 0.6)',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  heroStatLabel: {
    color: '#b5c5f9',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 2,
  },
  heroStatValue: {
    color: Colors.secondaryContainer,
    fontSize: 28,
    fontWeight: '700',
  },
  heroStatSubValue: {
    color: '#dadada',
    fontSize: 16,
    fontWeight: '400',
  },
  ctaCard: {
    backgroundColor: Colors.primaryContainer,
    borderRadius: 16,
    padding: 24,
    marginBottom: 32,
    overflow: 'hidden',
    alignItems: 'flex-start',
  },
  ctaBgIcon: {
    position: 'absolute',
    right: -20,
    top: -20,
    transform: [{ rotate: '12deg' }],
  },
  ctaTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.onPrimary,
    fontFamily: 'Georgia',
    marginBottom: 8,
  },
  ctaBody: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 20,
    lineHeight: 20,
  },
  ctaButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
  },
  ctaButtonText: {
    color: Colors.primary,
    fontWeight: '700',
    fontSize: 14,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  listTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.primary,
  },
  listSubtitle: {
    fontSize: 12,
    color: Colors.onSurfaceVariant,
  },
  ridesContainer: {
    gap: 16,
  },
  rideCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  rideCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  rideName: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: 4,
  },
  rideLand: {
    fontSize: 12,
    color: Colors.outline,
    fontWeight: '600',
  },
  waitTimeBox: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'center',
    minWidth: 60,
  },
  waitTimeNumber: {
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 20,
  },
  waitTimeLabel: {
    fontSize: 10,
    fontWeight: '700',
  },
  miniChartContainer: {
    height: 64,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
    marginTop: 16,
  },
  miniBar: {
    flex: 1,
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
  },
  rideCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
  },
  footerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#469ec5',
  },
  planButton: {
    padding: 0,
  },
});
