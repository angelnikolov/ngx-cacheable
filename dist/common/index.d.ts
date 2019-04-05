import { ICacheBusterConfig } from './ICacheBusterConfig';
import { ICacheConfig } from './ICacheConfig';
import { ICachePair } from './ICachePair';
import { DomPersistenceAdapter } from './DomPersistenceAdapter';
export declare const DEFAULT_CACHE_RESOLVER: (oldParams: any, newParams: any) => boolean;
export declare type ICacheRequestResolver = (oldParameters: Array<any>, newParameters: Array<any>) => boolean;
export declare type IShouldCacheDecider = (response: any) => boolean;
export declare type ICacheable<T> = (...args: any[]) => T;
export { ICacheBusterConfig, ICacheConfig, ICachePair, DomPersistenceAdapter };
