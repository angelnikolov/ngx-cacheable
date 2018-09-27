import { Observable } from 'rxjs';
export declare type ICacheRequestResolver = (oldParameters: Array<any>, newParameters: Array<any>) => boolean;
export declare type IShouldCacheDecider = (response: any) => boolean;
declare type ICacheable = (...args: any[]) => Observable<any>;
export interface ICacheConfig {
    /**
     * pass an Observable upon whose emission all caches will be busted
     */
    cacheBusterObserver?: Observable<any>;
    /**
     * @description request cache resolver which will get old and new paramaters passed to and based on those
     * will figure out if we need to bail out of cache or not
     */
    cacheResolver?: ICacheRequestResolver;
    /**
     * @description cache decider that will figure out if the response should be cached or not, based on it
     */
    shouldCacheDecider?: IShouldCacheDecider;
    /**
     * maxAge of cache in milliseconds
     * @description if time between method calls is larger - we bail out of cache
     */
    maxAge?: number;
    /**
     * whether should use a sliding expiration strategy on caches
     * this will reset the cache created property and keep the cache alive for @param maxAge milliseconds more
     */
    slidingExpiration?: boolean;
    /**
     * whether should use object-hash cache resolver
     * this will use a hash instead of JSON.stringify() to compare the parameters (allows for different key positions to be considered the same)
     * ie a parameter of {k1: true,k2:true} will be considered the same as {k2:true, k1:true} whereas the default cache resolver
     * would consider them different
     */
    hashcache?: boolean;
    /**
     * max cacheCount for different parameters
     * @description maximum allowed unique caches (same parameters)
     */
    maxCacheCount?: number;
    /**
     * cache will be resolved asynchronously - an extra change detection pass will be made by
     * @description should cache be resolved asynchronously? - helps with declarative forms and two-way databinding via ngModel
     */
    async?: boolean;
}
export declare function Cacheable(_cacheConfig?: ICacheConfig): (_target: Object, _propertyKey: string, propertyDescriptor: TypedPropertyDescriptor<ICacheable>) => TypedPropertyDescriptor<ICacheable>;
export {};
