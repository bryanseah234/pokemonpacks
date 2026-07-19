/**
 * CSV Manager Service
 * 
 * Handles loading, parsing, updating, and saving of CSV data for Pokémon sets and cards.
 * Provides utilities for synchronizing CSV data with the sets_cache.json.
 */

import { CardCSVRow, SetCSVRow, PokemonSet } from '@/types/pokemon';
import { toast } from 'sonner';

// Constants
const SETS_CSV_PATH = '/downloaded_sets.csv';
const CARDS_CSV_PATH = '/downloaded_cards.csv';
const SETS_CACHE_PATH = '/sets_cache.json';
const CSV_HEADER_SETS = 'set_id,set_name,printed_total,last_updated,last_checked,cards_downloaded,set_complete';
const CSV_HEADER_CARDS = 'set_id,set_name,card_number,filename,download_date,image_url,is_hires,file_size,download_duration,status';

/**
 * Load and parse CSV data from file
 */
async function loadCSV<T>(filePath: string): Promise<T[]> {
  try {
    const response = await fetch(filePath);
    if (!response.ok) {
      throw new Error(`Failed to load CSV file: ${filePath}`);
    }
    
    const csvText = await response.text();
    const rows = csvText.split('\n').filter(row => row.trim().length > 0);
    
    // Skip header row and parse each data row
    const header = rows[0];
    const dataRows = rows.slice(1);
    
    return dataRows.map(row => {
      const values = parseCSVRow(row);
      const headers = parseCSVRow(header);
      const obj: Record<string, string | number | boolean> = {};
      
      headers.forEach((header, index) => {
        // Handle different data types
        const value = values[index];
        if (value === undefined) return;
        
        if (header === 'set_complete') {
          obj[header] = value.toLowerCase() === 'true';
        } else if (
          header === 'printed_total' || 
          header === 'cards_downloaded' || 
          header === 'file_size' || 
          header === 'download_duration'
        ) {
          obj[header] = parseFloat(value) || 0;
        } else if (header === 'is_hires') {
          obj[header] = value.toLowerCase() === 'true';
        } else {
          obj[header] = value;
        }
      });
      
      return obj as T;
    });
  } catch (error) {
    console.error(`Error loading CSV file ${filePath}:`, error);
    toast.error(`Failed to load ${filePath.split('/').pop()}. Using empty data set.`);
    return [];
  }
}

/**
 * Parse a CSV row correctly handling quoted fields
 */
function parseCSVRow(row: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < row.length; i++) {
    const char = row[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  
  // Don't forget to push the last field
  result.push(current);
  
  return result;
}

/**
 * Convert array of objects to CSV format
 */
function convertToCSV<T>(data: T[], header: string): string {
  if (data.length === 0) return header;
  
  const rows = data.map(item => {
    const values = header.split(',').map(key => {
      const value = (item as Record<string, unknown>)[key];
      
      // Handle different data types for CSV formatting
      if (value === undefined || value === null) {
        return '';
      } else if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
        // Escape quotes and wrap in quotes if contains commas or quotes
        return `"${value.replace(/"/g, '""')}"`;
      } else {
        return String(value);
      }
    });
    
    return values.join(',');
  });
  
  return [header, ...rows].join('\n');
}

/**
 * Save CSV data back to file
 */
async function saveCSV(filePath: string, csvContent: string): Promise<boolean> {
  try {
    // In a real app, we would call a backend API to save the file
    // For this example, we'll assume the file can be saved directly
    console.log(`Saving CSV to ${filePath}:`, csvContent.slice(0, 100) + '...');
    
    // Mock success for now - in a real app you'd send to server
    // and use proper file system access
    return true;
  } catch (error) {
    console.error(`Error saving CSV file ${filePath}:`, error);
    toast.error(`Failed to save ${filePath.split('/').pop()}.`);
    return false;
  }
}

/**
 * Load sets cache from JSON file
 */
async function loadSetsCache(): Promise<PokemonSet[]> {
  try {
    const response = await fetch(SETS_CACHE_PATH);
    if (!response.ok) {
      throw new Error('Failed to load sets cache');
    }
    
    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error('Error loading sets cache:', error);
    toast.error('Failed to load sets cache.');
    return [];
  }
}

/**
 * Save updated sets cache to JSON file
 */
async function saveSetsCache(sets: PokemonSet[]): Promise<boolean> {
  try {
    // In a real app, we would call a backend API to save the file
    // For this example, we'll assume the file can be saved directly
    const jsonContent = JSON.stringify({ data: sets }, null, 2);
    console.log(`Saving sets cache:`, jsonContent.slice(0, 100) + '...');
    
    // Mock success for now - in a real app you'd send to server
    return true;
  } catch (error) {
    console.error('Error saving sets cache:', error);
    toast.error('Failed to save sets cache.');
    return false;
  }
}

/**
 * Create a new card CSV row
 */
function createCardCSVRow(set_id: string, set_name: string, card_number: string): CardCSVRow {
  const filename = `${card_number}_hires.png`;
  const image_url = `https://images.pokemontcg.io/${set_id}/${card_number}_hires.png`;
  const currentDate = new Date().toISOString().replace('T', ' ').slice(0, 19);
  
  return {
    set_id,
    set_name,
    card_number,
    filename,
    download_date: '',
    image_url,
    is_hires: true,
    file_size: 0,
    download_duration: 0,
    status: 'pending'
  };
}

/**
 * Update sets CSV data with latest from sets cache
 */
async function updateSetsCSV(existingSets: SetCSVRow[], cacheSets: PokemonSet[]): Promise<SetCSVRow[]> {
  const updatedSets: SetCSVRow[] = [...existingSets];
  const existingSetIds = new Set(existingSets.map(set => set.set_id));
  const currentDate = new Date().toISOString().replace('T', ' ').slice(0, 19);
  
  // Update existing sets and add new ones
  for (const cacheSet of cacheSets) {
    if (existingSetIds.has(cacheSet.id)) {
      // Update existing set
      const setIndex = updatedSets.findIndex(set => set.set_id === cacheSet.id);
      if (setIndex >= 0) {
        updatedSets[setIndex].set_name = cacheSet.name;
        updatedSets[setIndex].printed_total = cacheSet.printedTotal;
        updatedSets[setIndex].last_updated = cacheSet.updatedAt;
        updatedSets[setIndex].last_checked = currentDate;
        updatedSets[setIndex].set_complete = false; // Always set to false per requirements
      }
    } else {
      // Add new set
      updatedSets.push({
        set_id: cacheSet.id,
        set_name: cacheSet.name,
        printed_total: cacheSet.printedTotal,
        last_updated: cacheSet.updatedAt,
        last_checked: currentDate,
        cards_downloaded: 0,
        set_complete: false
      });
    }
  }
  
  return updatedSets;
}

/**
 * Update cards CSV data based on sets
 */
async function updateCardsCSV(existingCards: CardCSVRow[], updatedSets: SetCSVRow[]): Promise<CardCSVRow[]> {
  const updatedCards: CardCSVRow[] = [];
  
  // Create a map for quicker lookups
  const existingCardMap = new Map<string, CardCSVRow>();
  existingCards.forEach(card => {
    const cardKey = `${card.set_id}-${card.card_number}`;
    existingCardMap.set(cardKey, card);
  });
  
  // Process each set
  for (const set of updatedSets) {
    // Generate entries for every card number from 1 to printed_total
    for (let i = 1; i <= set.printed_total; i++) {
      const cardNumber = String(i);
      const cardKey = `${set.set_id}-${cardNumber}`;
      
      if (existingCardMap.has(cardKey)) {
        // Existing card - keep its data but set status to pending
        const existingCard = existingCardMap.get(cardKey)!;
        existingCard.status = 'pending';
        updatedCards.push(existingCard);
      } else {
        // New card - create a new entry
        updatedCards.push(createCardCSVRow(set.set_id, set.set_name, cardNumber));
      }
    }
  }
  
  return updatedCards;
}

/**
 * Public API: Load both CSV files
 */
export async function loadCSVData() {
  const sets = await loadCSV<SetCSVRow>(SETS_CSV_PATH);
  const cards = await loadCSV<CardCSVRow>(CARDS_CSV_PATH);
  return { sets, cards };
}

/**
 * Public API: Update CSVs with latest sets data
 */
export async function refreshCSVData(): Promise<boolean> {
  try {
    toast.info('Starting CSV data refresh. Please wait...');
    
    // Load existing data
    const { sets: existingSets, cards: existingCards } = await loadCSVData();
    
    // Load sets cache
    const cacheSets = await loadSetsCache();
    if (cacheSets.length === 0) {
      toast.error('Failed to load sets cache. Cannot update CSVs.');
      return false;
    }
    
    // Update sets CSV
    toast.info('Updating sets data...');
    const updatedSets = await updateSetsCSV(existingSets, cacheSets);
    const setsCSV = convertToCSV(updatedSets, CSV_HEADER_SETS);
    const setsSaveSuccess = await saveCSV(SETS_CSV_PATH, setsCSV);
    
    // Update cards CSV
    toast.info('Generating card entries...');
    const updatedCards = await updateCardsCSV(existingCards, updatedSets);
    const cardsCSV = convertToCSV(updatedCards, CSV_HEADER_CARDS);
    const cardsSaveSuccess = await saveCSV(CARDS_CSV_PATH, cardsCSV);
    
    if (setsSaveSuccess && cardsSaveSuccess) {
      toast.success('CSV data updated successfully!');
      return true;
    } else {
      toast.error('Failed to save one or more CSV files.');
      return false;
    }
  } catch (error) {
    console.error('Error refreshing CSV data:', error);
    toast.error('An error occurred while updating CSV data.');
    return false;
  }
}

/**
 * Get all cards available for use (regardless of status)
 */
export async function getPendingCards(): Promise<CardCSVRow[]> {
  console.log('[CSVManager] Loading CSV data to find available cards...');
  const { cards } = await loadCSVData();
  console.log(`[CSVManager] Loaded ${cards.length} total cards from CSV`);
  
  // Log first few cards to see their details
  if (cards.length > 0) {
    console.log('[CSVManager] First 3 cards:', cards.slice(0, 3).map(c => ({
      id: `${c.set_id}-${c.card_number}`,
      status: c.status,
      image_url: c.image_url
    })));
  }
  
  // Return all cards regardless of status
  console.log(`[CSVManager] Found ${cards.length} available cards (all cards, no status filter)`);
  
  return cards;
}

/**
 * Get a specified number of random cards for download
 */
export async function getRandomPendingCards(count: number = 100): Promise<CardCSVRow[]> {
  console.log(`[CSVManager] Getting ${count} random pending cards...`);
  const pendingCards = await getPendingCards();
  
  if (pendingCards.length === 0) {
    console.warn('[CSVManager] No pending cards found! Check CSV file status column.');
    return [];
  }
  
  // Shuffle the array (Fisher-Yates algorithm)
  for (let i = pendingCards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pendingCards[i], pendingCards[j]] = [pendingCards[j], pendingCards[i]];
  }
  
  const selectedCards = pendingCards.slice(0, count);
  console.log(`[CSVManager] Selected ${selectedCards.length} random cards for download`);
  console.log('[CSVManager] First 3 selected cards:', selectedCards.slice(0, 3).map(c => ({
    id: `${c.set_id}-${c.card_number}`,
    name: c.set_name,
    image_url: c.image_url
  })));
  
  return selectedCards;
}
