import React, { useState, useMemo, useCallback } from 'react';
import { CardData, PokemonTCGCard } from '@/types/pokemon';
import { PokemonCard } from './PokemonCard';
import { Button } from './ui/button';
import { Heart, Trash, Loader2, Search, Filter } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { toast } from 'sonner';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';


interface DashboardProps {
  favorites: CardData[];
  onRemoveFavorite: (cardId: string) => void;
  onBackToHome: () => void;
}

type MaybeSessionCard = CardData & {
  isSessionCard?: boolean;
};

// Cache for card details to avoid repeated API calls
const cardDetailsCache: Record<string, PokemonTCGCard> = {};

export const Dashboard = ({ favorites, onRemoveFavorite, onBackToHome }: DashboardProps) => {
  const [selected, setSelected] = useState<CardData | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [selectedDetails, setSelectedDetails] = useState<PokemonTCGCard | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [setFilter, setSetFilter] = useState<string>('all');

  // Filter and search logic
  const filteredFavorites = useMemo(() => {
    return favorites.filter((card) => {
      const matchesSearch = searchQuery === '' || 
        card.card.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        card.card.set?.name?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesSet = setFilter === 'all' || 
        card.card.set?.name === setFilter;
      
      return matchesSearch && matchesSet;
    });
  }, [favorites, searchQuery, setFilter]);

  // Get unique sets for filters
  const uniqueSets = useMemo(() => {
    const sets = [...new Set(favorites.map(card => card.card.set?.name).filter(Boolean))];
    return sets.sort();
  }, [favorites]);

  // prefetched images for faster modal open (small set)
  useMemo(() => {
    favorites.slice(0, 10).forEach((f) => {
      const img = new Image();
      img.src = f.card.images.small || f.card.images.large;
    });
  }, [favorites]);
  
  // Fetch card details when a card is selected
  const fetchCardDetails = useCallback(async (card: CardData) => {
    // If card has isSessionCard flag, it's from session storage and needs API call for details
    const needsDetailsFetch = (card as MaybeSessionCard).isSessionCard === true;
    const cardId = card.card.id;
    
    // If it doesn't need details or we already have them cached, use cache
    if (!needsDetailsFetch || cardDetailsCache[cardId]) {
      setSelectedDetails(cardDetailsCache[cardId] || card.card);
      return;
    }
    
    // Otherwise fetch details
    setIsLoadingDetails(true);
    
    try {
      // Fetch card details from API
      const API_BASE = 'https://api.pokemontcg.io/v2';
      const response = await fetch(`${API_BASE}/cards/${cardId}`);
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const data = await response.json();
      const cardDetails = data.data;
      
      // Cache the results
      cardDetailsCache[cardId] = cardDetails;
      setSelectedDetails(cardDetails);
      
    } catch (error) {
      console.error('Error fetching card details:', error);
      toast.error('Could not load full card details');
      // Fall back to basic card info
      setSelectedDetails(card.card);
    } finally {
      setIsLoadingDetails(false);
    }
  }, []);


  const handleClearSession = () => {
    try {
      window.sessionStorage.removeItem('currentPack');
      window.sessionStorage.removeItem('favorites');
      // also remove any other keys that start with 'pack' or 'fav'
      // (careful: keep it minimal to avoid removing unrelated keys)
    } catch (e) {
      console.error(e);
    }
    // reload to reflect cleared session
    window.location.reload();
  };
  return (
    <div className="h-full w-full flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto p-8">
        
        {/* Search and Filters and Remove all - only show if there are favorites */}
        {favorites.length > 0 && (
          <div className="mb-8 space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center lg:gap-4">
              {/* Search bar */}
              <div className="relative flex-1 min-w-[200px] mb-4 lg:mb-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search cards by name or set..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
        
              {/* Filter + Remove All */}
              <div className="flex flex-col gap-3 sm:flex-row sm:gap-4 w-full lg:w-auto lg:flex-row lg:flex-none lg:ml-auto">
                {/* Set Filter */}
                <div className="flex w-full sm:w-1/2 lg:w-[160px]">
                  <Select value={setFilter} onValueChange={setSetFilter}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Set" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Sets</SelectItem>
                      {uniqueSets.map((set) => (
                        <SelectItem key={set} value={set}>
                          {set}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
        
                {/* Remove All Button */}
                <div className="flex w-full sm:w-1/2 lg:w-auto justify-end">
                  <Button
                    onClick={handleClearSession}
                    variant="destructive"
                    size="sm"
                    className="flex items-center justify-center gap-1 text-xs w-full sm:w-full lg:w-auto"
                  >
                    <Trash className="w-3 h-3" />
                    Remove All
                  </Button>
                </div>
              </div>
            </div>
        
            {/* Filter summary */}
            {(searchQuery || setFilter !== 'all') && (
              <div className="text-sm text-muted-foreground">
                Showing {filteredFavorites.length} of {favorites.length} cards
              </div>
            )}
          </div>
        )}


        {/* Content area - either empty state or grid of cards */}
        {favorites.length === 0 ? (
          <div className="flex items-center justify-center text-center min-h-[70vh]">
            <div>
              <div className="mb-6">
                <Heart className="w-16 h-16 text-muted-foreground/30 mx-auto" />
              </div>
              <p className="text-3xl font-bold text-muted-foreground mb-4">No favorites yet!</p>
              <p className="text-muted-foreground text-lg max-w-sm mx-auto">
                Swipe <span className="font-semibold">right</span> on cards you like to add them to your collection.
              </p>
              <div className="mt-8">
                <Button 
                  onClick={onBackToHome}
                  variant="outline"
                  className="px-6"
                >
                  Back to Home
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-8">
            {filteredFavorites.map((card) => (
              <div key={card.id} className="flex flex-col items-center">
                <div 
                  className="transition-transform hover:scale-105 cursor-pointer" 
                  onClick={() => {
                    setSelected(card);
                    setSelectedDetails(null); // Clear previous details
                    fetchCardDetails(card); // Fetch details when card is selected
                  }}
                >
                  <PokemonCard 
                    card={card} 
                    size="grid"
                    className="max-w-[245px]"
                  />
                </div>
                <div className="mt-4 text-center w-full max-w-[245px]">
                  <p className="font-semibold text-lg">#{card.card.number || 'Unknown'}</p>
                  <p className="text-sm text-muted-foreground mb-3">{card.card.set.name}</p>
                  <Button
                    onClick={() => onRemoveFavorite(card.id)}
                    variant="destructive"
                    size="sm"
                    className="w-full"
                  >
                    Remove
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
        </div>
      </div>

      {/* Modal for selected card (controlled) */}
      <Dialog open={!!selected} onOpenChange={(open) => { 
        if (!open) {
          setSelected(null);
          setSelectedDetails(null);
        }
      }}>
        {selected && (
          <DialogContent className="max-w-[95vw] sm:max-w-[500px] md:max-w-[700px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-lg sm:text-xl">
                {isLoadingDetails ? 'Loading...' : selectedDetails?.name || selected.card.name}
              </DialogTitle>
            </DialogHeader>
            
            {isLoadingDetails ? (
              <div className="py-12 flex flex-col items-center justify-center">
                <Loader2 className="w-12 h-12 animate-spin mb-4 text-primary" />
                <p className="text-muted-foreground">Loading card details...</p>
              </div>
            ) : (
              <div className="flex flex-col md:grid md:grid-cols-2 gap-6">
                <div className="flex justify-center items-start">
                  <PokemonCard 
                    card={selected} 
                    size="grid"
                    className="max-w-[245px]"
                  />
                </div>
                <div className="flex flex-col gap-3">
                  <div>
                    <p className="text-sm font-semibold">Set</p>
                    <p className="text-sm text-muted-foreground">
                      {selectedDetails?.set?.name || selected.card.set.name}
                    </p>
                  </div>
                  
                  <div>
                    <p className="text-sm font-semibold">Number</p>
                    <p className="text-sm text-muted-foreground">
                      {selectedDetails?.number || selected.card.number || 'Unknown'}
                    </p>
                  </div>
                  
                  <div>
                    <p className="text-sm font-semibold">Rarity</p>
                    <p className="text-sm text-muted-foreground">
                      {selectedDetails?.rarity || selected.rarity || 'Unknown'}
                    </p>
                  </div>
                  
                  {selectedDetails?.supertype && (
                    <div>
                      <p className="text-sm font-semibold">Type</p>
                      <p className="text-sm text-muted-foreground">{selectedDetails.supertype}</p>
                    </div>
                  )}
                  
                  {selectedDetails?.hp && (
                    <div>
                      <p className="text-sm font-semibold">HP</p>
                      <p className="text-sm text-muted-foreground">{selectedDetails.hp}</p>
                    </div>
                  )}
                  
                  {(selectedDetails?.attacks || selected.card.attacks)?.length > 0 && (
                    <div>
                      <p className="text-sm font-semibold">Attacks</p>
                      {(selectedDetails?.attacks || selected.card.attacks)?.map((attack, i) => (
                        <div key={`attack-${i}`} className="mb-2 last:mb-0">
                          <p className="text-sm font-medium">
                            {attack.name} 
                            {attack.damage && <span className="ml-1">({attack.damage})</span>}
                          </p>
                          {attack.text && <p className="text-xs text-muted-foreground">{attack.text}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {selectedDetails?.abilities?.length > 0 && (
                    <div>
                      <p className="text-sm font-semibold">Abilities</p>
                      {selectedDetails.abilities.map((ability, i) => (
                        <div key={`ability-${i}`} className="mb-2 last:mb-0">
                          <p className="text-sm font-medium">{ability.name} ({ability.type})</p>
                          <p className="text-xs text-muted-foreground">{ability.text}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
            
            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button
                variant="destructive"
                onClick={() => {
                  onRemoveFavorite(selected.id);
                  setSelected(null);
                  setSelectedDetails(null);
                }}
                className="w-full sm:w-auto"
                disabled={isLoadingDetails}
              >
                Remove
              </Button>
              <Button 
                onClick={() => {
                  setSelected(null);
                  setSelectedDetails(null);
                }} 
                variant="outline" 
                className="w-full sm:w-auto"
              >
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
};



