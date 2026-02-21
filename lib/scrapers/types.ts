export interface ScrapedEvent {
    name: string;
    date: Date;
    location: string;
    url: string;
    purse?: number;
}

export interface Scraper {
    scrape(): Promise<ScrapedEvent[]>;
}
