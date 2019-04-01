import { Subject } from 'rxjs';
import { globalCacheBusterNotifier } from './cacheable.decorator';
import { PCacheBuster } from './promise.cache-buster.decorator';
import { PCacheable } from './promise.cacheable.decorator';
jasmine.DEFAULT_TIMEOUT_INTERVAL = 15000;
const cacheBusterNotifier = new Subject();
class Service {
  mockServiceCall(parameter) {
    return new Promise(resolve => {
      setTimeout(() => {
        resolve({ payload: parameter });
      }, 1000);
    });
  }
  mockSaveServiceCall() {
    return new Promise(resolve => {
      setTimeout(() => {
        resolve('SAVED');
      }, 1000);
    });
  }

  mockServiceCallWithMultipleParameters(parameter1, parameter2) {
    return new Promise(resolve => {
      setTimeout(() => {
        resolve({payload: [parameter1, parameter2]});
      }, 1000);
    });
  }

  @PCacheable()
  getData(parameter: string) {
    return this.mockServiceCall(parameter);
  }

  @PCacheable()
  getDataWithParamsObj(parameter: any) {
    return this.mockServiceCall(parameter);
  }

  @PCacheable()
  getDataAndReturnCachedStream(parameter: string) {
    return this.mockServiceCall(parameter);
  }

  @PCacheable({
    maxAge: 1500
  })
  getDataWithExpiration(parameter: string) {
    return this.mockServiceCall(parameter);
  }

  @PCacheable({
    maxAge: 1500,
    slidingExpiration: true
  })
  getDataWithSlidingExpiration(parameter: string) {
    return this.mockServiceCall(parameter);
  }

  @PCacheable({
    maxCacheCount: 5
  })
  getDataWithMaxCacheCount(parameter: string) {
    return this.mockServiceCall(parameter);
  }

  @PCacheable({
    maxAge: 1500,
    maxCacheCount: 5
  })
  getDataWithMaxCacheCountAndExpiration(parameter: string) {
    return this.mockServiceCall(parameter);
  }

  @PCacheable({
    maxAge: 1500,
    maxCacheCount: 5,
    slidingExpiration: true
  })
  getDataWithMaxCacheCountAndSlidingExpiration(parameter: string) {
    return this.mockServiceCall(parameter);
  }

  @PCacheable({
    cacheResolver: (_oldParameters, newParameters) => {
      return newParameters.find(param => !!param.straightToLastCache);
    }
  })
  getDataWithCustomCacheResolver(
    parameter: string,
    _cacheRerouterParameter?: { straightToLastCache: boolean }
  ) {
    return this.mockServiceCall(parameter);
  }

  @PCacheable({
    shouldCacheDecider: (response: { payload: string }) => {
      return response.payload === 'test';
    }
  })
  getDataWithCustomCacheDecider(parameter: string) {
    return this.mockServiceCall(parameter);
  }

  @PCacheBuster({
    cacheBusterNotifier: cacheBusterNotifier
  })
  saveDataAndCacheBust() {
    return this.mockSaveServiceCall();
  }

  @PCacheable({
    cacheBusterObserver: cacheBusterNotifier.asObservable()
  })
  getDataWithCacheBusting(parameter: string) {
    return this.mockServiceCall(parameter);
  }

  @PCacheable()
  getDataWithUndefinedParameter(parameter: string = '') {
    return this.mockServiceCall(parameter);
  }

  @PCacheable()
  getDataWithMultipleUndefinedParameters(parameter: string = 'Parameter1', parameter1: string = 'Parameter2') {
    return this.mockServiceCallWithMultipleParameters(parameter, parameter1);
  }
}
describe('PCacheableDecorator', () => {
  let service: Service = null;
  let mockServiceCallSpy: jasmine.Spy = null;
  beforeEach(() => {
    service = new Service();
    mockServiceCallSpy = spyOn(service, 'mockServiceCall').and.callThrough();
  });

  it('return cached data up until a new parameter is passed and the cache is busted', async () => {
    const asyncFreshData = await service.getData('test');
    expect(asyncFreshData).toEqual({ payload: 'test' });
    expect(mockServiceCallSpy).toHaveBeenCalledTimes(1);

    const cachedResponse = await service.getData('test');
    expect(cachedResponse).toEqual({ payload: 'test' });
    /**
     * response acquired from cache, so no incrementation on the service spy call counter is expected here
     */
    expect(mockServiceCallSpy).toHaveBeenCalledTimes(1);

    await service.getData('test2');

    /**
     * no cache for 'test2', but service call was made so the spy counter is incremented
     */
    expect(mockServiceCallSpy).toHaveBeenCalledTimes(2);

    const cachedResponse3 = await service.getData('test3');

    // /**
    //  * service call is made and waited out
    //  */
    expect(cachedResponse3).toEqual({ payload: 'test3' });
    expect(mockServiceCallSpy).toHaveBeenCalledTimes(3);

    /**
     * this should NOT return cached response, since the currently cached one should be 'test3'
     */
    await service.getData('test');

    expect(mockServiceCallSpy).toHaveBeenCalledTimes(4);
  });

  it('returns promises in cache with a referential type params', () => {
    jasmine.clock().install();
    let params = {
      number: [1]
    };
    /**
     * call the service endpoint with current params values
     */
    service.getDataWithParamsObj(params);

    /**
     * return the response
     */
    jasmine.clock().tick(1000);

    /**
     * change params object values
     */
    params.number.push(2);
    /**
     * call again..
     */
    service.getDataWithParamsObj(params);
    /**
     * service call count should still be 2, since param object has changed
     */
    expect(mockServiceCallSpy).toHaveBeenCalledTimes(2);
    jasmine.clock().uninstall();
  });

  it('return the cached observable up until it completes or errors', () => {
    jasmine.clock().install();
    /**
     * call the service endpoint five hundred times with the same parameter
     * but the service should only be called once, since the observable will be cached
     */
    for (let i = 0; i < 500; i++) {
      service.getDataAndReturnCachedStream('test');
    }

    expect(mockServiceCallSpy).toHaveBeenCalledTimes(1);
    /**
     * return the response
     */
    jasmine.clock().tick(1000);
    /**
     * call again..
     */
    service.getDataAndReturnCachedStream('test');
    /**
     * service call count should still be 1, since we are returning from cache now
     */
    expect(mockServiceCallSpy).toHaveBeenCalledTimes(1);
    jasmine.clock().uninstall();
  });

  it('return cached date up until the maxAge period has passed and then bail out to data source', async done => {
    const asyncFreshData = await service.getDataWithExpiration('test');

    expect(asyncFreshData).toEqual({ payload: 'test' });
    expect(mockServiceCallSpy).toHaveBeenCalledTimes(1);

    const cachedResponse = await service.getDataWithExpiration('test');
    expect(cachedResponse).toEqual({ payload: 'test' });
    expect(mockServiceCallSpy).toHaveBeenCalledTimes(1);

    setTimeout(() => {
      /**
       * after 1501ms the cache would've expired and we will bail to the data source
       */
      service.getDataWithExpiration('test');
      expect(mockServiceCallSpy).toHaveBeenCalledTimes(2);
      done();
    }, 1501);
  });

  it('return cached data up until the maxAge period but renew the expiration if called within the period', async done => {
    const asyncFreshData = await service.getDataWithSlidingExpiration('test');
    expect(asyncFreshData).toEqual({ payload: 'test' });
    expect(mockServiceCallSpy).toHaveBeenCalledTimes(1);

    const cachedResponse = await service.getDataWithSlidingExpiration('test');
    expect(cachedResponse).toEqual({ payload: 'test' });
    /**
     * call count should still be one, since we rerouted to cache, instead of service call
     */
    expect(mockServiceCallSpy).toHaveBeenCalledTimes(1);

    setTimeout(() => {
      service.getDataWithSlidingExpiration('test');
      expect(mockServiceCallSpy).toHaveBeenCalledTimes(1);
      setTimeout(() => {
        service.getDataWithSlidingExpiration('test');
        expect(mockServiceCallSpy).toHaveBeenCalledTimes(2);
        done();
      }, 1501);
    }, 500);
  });

  it('return cached data for 5 unique requests, then should bail to data source', async () => {
    /**
     * call the same endpoint with 5 different parameters and cache all 5 responses, based on the maxCacheCount parameter
     */
    const parameters = ['test1', 'test2', 'test3', 'test4', 'test5'];
    parameters.forEach(
      async param => await (service.getDataWithMaxCacheCount(param), 1000)
    );
    /**
     * data for all endpoints should be available through cache by now
     */
    expect(mockServiceCallSpy).toHaveBeenCalledTimes(5);

    const cachedResponse = await service.getDataWithMaxCacheCount('test1');
    expect(cachedResponse).toEqual({ payload: 'test1' });
    /** call count still 5 */
    expect(mockServiceCallSpy).toHaveBeenCalledTimes(5);

    /**
     * this should return a maximum of 5 different cached responses
     */
    const cachedResponseAll = await Promise.all(
      parameters.map(param => service.getDataWithMaxCacheCount(param))
    );

    expect(cachedResponseAll).toEqual([
      { payload: 'test1' },
      { payload: 'test2' },
      { payload: 'test3' },
      { payload: 'test4' },
      { payload: 'test5' }
    ]);
    /** call count still 5 */
    expect(mockServiceCallSpy).toHaveBeenCalledTimes(5);

    const asyncData = await service.getDataWithMaxCacheCount('test6');

    expect(asyncData).toEqual({ payload: 'test6' });
    /** call count incremented by one */
    expect(mockServiceCallSpy).toHaveBeenCalledTimes(6);

    /**
     * by now the response for test6 should be cached and the one for test1 should be free for GC..
     */
    const newParameters = ['test2', 'test3', 'test4', 'test5', 'test6'];

    /**
     * this should return a maximum of 5 different cached responses, with the latest one in the end
     */
    const cachedResponseAll2 = await Promise.all(
      newParameters.map(param => service.getDataWithMaxCacheCount(param))
    );

    expect(cachedResponseAll2).toEqual([
      { payload: 'test2' },
      { payload: 'test3' },
      { payload: 'test4' },
      { payload: 'test5' },
      { payload: 'test6' }
    ]);

    /** no service calls will be made, since we have all the responses still cached even after 1s (1000ms) */
    expect(mockServiceCallSpy).toHaveBeenCalledTimes(6);
    /**
     * fetch and cache the test7 response
     */
    const nonCachedResponse = await service.getDataWithMaxCacheCount('test7');
    expect(nonCachedResponse).toEqual({ payload: 'test7' });
    expect(mockServiceCallSpy).toHaveBeenCalledTimes(7);

    /**
     * since the cached response for 'test2' was now removed from cache by 'test7',
     */
    await service.getDataWithMaxCacheCount('test2');
    /**
     * test2 is not in cache anymore and a service call will be made
     */
    expect(mockServiceCallSpy).toHaveBeenCalledTimes(8);
  });

  it('return cached data for 5 unique requests all available for 7500ms', async done => {
    /**
     * call the same endpoint with 5 different parameters and cache all 5 responses, based on the maxCacheCount parameter
     */
    const parameters = ['test1', 'test2', 'test3', 'test4', 'test5'];
    parameters.forEach(param =>
      service.getDataWithMaxCacheCountAndExpiration(param)
    );
    expect(mockServiceCallSpy).toHaveBeenCalledTimes(5);

    const cachedResponse2 = await Promise.all(
      parameters.map(param =>
        service.getDataWithMaxCacheCountAndExpiration(param)
      )
    );
    expect(mockServiceCallSpy).toHaveBeenCalledTimes(5);

    expect(cachedResponse2).toEqual([
      { payload: 'test1' },
      { payload: 'test2' },
      { payload: 'test3' },
      { payload: 'test4' },
      { payload: 'test5' }
    ]);

    setTimeout(() => {
      service.getDataWithMaxCacheCountAndExpiration('test1');
      /**
       * by now, no cache exists for the 'test1' parameter, so 1 more call will be made to the service
       */
      expect(mockServiceCallSpy).toHaveBeenCalledTimes(6);
      done();
    }, 1501);
  });

  it('return cached data up until new parameters are passed WITH a custom resolver function', async () => {
    const asyncFreshData = await service.getDataWithCustomCacheResolver(
      'test1'
    );
    expect(asyncFreshData).toEqual({ payload: 'test1' });
    expect(mockServiceCallSpy).toHaveBeenCalled();

    const asyncFreshData2 = await service.getDataWithCustomCacheResolver(
      'test2'
    );
    expect(asyncFreshData2).toEqual({ payload: 'test2' });
    expect(mockServiceCallSpy).toHaveBeenCalledTimes(2);

    const cachedResponse = await service.getDataWithCustomCacheResolver(
      'test3',
      {
        straightToLastCache: true
      }
    );
    expect(cachedResponse).toEqual({ payload: 'test2' });
    /**
     * call count still 2, since we rerouted directly to cache
     */
    expect(mockServiceCallSpy).toHaveBeenCalledTimes(2);
    await service.getDataWithCustomCacheResolver('test3');
    /**no cache reerouter -> bail to service call -> increment call counter*/
    expect(mockServiceCallSpy).toHaveBeenCalledTimes(3);
  });

  it('only cache data when a specific response is returned, otherwise it should bail to service call', async () => {
    const asyncData = await service.getDataWithCustomCacheDecider('test1');
    expect(asyncData).toEqual({ payload: 'test1' });
    expect(mockServiceCallSpy).toHaveBeenCalledTimes(1);

    await service.getDataWithCustomCacheDecider('test1');
    expect(mockServiceCallSpy).toHaveBeenCalledTimes(2);

    /**
     * next calls will be for 'test' whose response will match the cache deciders condition and it will be cached
     */

    const asyncData2 = await service.getDataWithCustomCacheDecider('test');
    expect(asyncData2).toEqual({ payload: 'test' });
    expect(mockServiceCallSpy).toHaveBeenCalledTimes(3);

    /**
     * this call has to return cached data, since we the response cache decider should have matched the previous one
     */
    const cachedData2 = await service.getDataWithCustomCacheDecider('test');
    expect(cachedData2).toEqual({ payload: 'test' });
    /**
     * the service call count won't be incremented
     */
    expect(mockServiceCallSpy).toHaveBeenCalledTimes(3);
  });

  it('cache data until the cacheBusterNotifier has emitted', async () => {
    const asyncFreshData = await service.getDataWithCacheBusting('test');
    expect(asyncFreshData).toEqual({ payload: 'test' });
    expect(mockServiceCallSpy).toHaveBeenCalledTimes(1);

    const cachedResponse = await service.getDataWithCacheBusting('test');
    expect(cachedResponse).toEqual({ payload: 'test' });
    /**
     * response acquired from cache, so no incrementation on the service spy call counter is expected here
     */
    expect(mockServiceCallSpy).toHaveBeenCalledTimes(1);

    /**
     * make the save call
     * after 1 second the cache busting subject will emit and the cache for getDataWithCacheBusting('test') will be relieved of
     */
    expect(await service.saveDataAndCacheBust()).toEqual('SAVED');

    await service.getDataWithCacheBusting('test');
    /**
     * call count has incremented due to the actual method call (instead of cache)
     */
    expect(mockServiceCallSpy).toHaveBeenCalledTimes(2);
    /**
     * pass through 1s of time
     */
    /**
     * synchronous cached response should now be returned
     */
    expect(await service.getDataWithCacheBusting('test')).toEqual({
      payload: 'test'
    });
  });

  it('should clear all caches when the global cache buster is called', async() => {
    /**
     * set up a service with multiple cached methods
     */
    class Service {
      mockServiceCall(parameter) {
        return new Promise(resolve => {
          setTimeout(() => {
            resolve({ payload: parameter });
          }, 1000);
        });
      }

      @PCacheable()
      getData1(parameter: string) {
        return this.mockServiceCall(parameter);
      }

      @PCacheable()
      getData2(parameter: string) {
        return this.mockServiceCall(parameter);
      }

      @PCacheable()
      getData3(parameter: string) {
        return this.mockServiceCall(parameter);
      }
    }

    const service = new Service();
    mockServiceCallSpy = spyOn(service, 'mockServiceCall').and.callThrough();
    /**
     * call the first method and cache it
     */
    service.getData1('test1');
    const asyncFreshData1 = await(
      service.getData1('test1')
    );
    expect(asyncFreshData1).toEqual({ payload: 'test1' });
    const cachedResponse1 = await(service.getData1('test1'));
    expect(cachedResponse1).toEqual({ payload: 'test1' });
    /**
     * even though we called getData1 twice, this should only be called once
     * since the second call went straight to the cache
     */
    expect(mockServiceCallSpy).toHaveBeenCalledTimes(1);

    service.getData2('test2');
    const asyncFreshData2 = await(
      service.getData2('test2')
    );
    expect(asyncFreshData2).toEqual({ payload: 'test2' });
    const cachedResponse2 = await(service.getData2('test2'));
    expect(cachedResponse2).toEqual({ payload: 'test2' });
    expect(mockServiceCallSpy).toHaveBeenCalledTimes(2);

    service.getData3('test3');
    const asyncFreshData3 = await(service.getData3('test3'));
    expect(asyncFreshData3).toEqual({ payload: 'test3' });
    const cachedResponse3 = await(service.getData3('test3'));
    expect(cachedResponse3).toEqual({ payload: 'test3' });
    expect(mockServiceCallSpy).toHaveBeenCalledTimes(3);

    /**
     * bust all caches
     */
    globalCacheBusterNotifier.next();

    await(service.getData1('test1'));
    await(service.getData2('test2'));
    await(service.getData3('test3'));

    /**
     * if we didn't bust the cache, this would've been 3
     */
    expect(mockServiceCallSpy).toHaveBeenCalledTimes(6);
  });
  
  it('should not change undefined parameters to null', async () => {
    service.getDataWithUndefinedParameter(undefined);
    expect(mockServiceCallSpy).toHaveBeenCalledWith('');
    service.getDataWithUndefinedParameter();
    expect(mockServiceCallSpy).toHaveBeenCalledWith('');

    let mockServiceCallWithMultipleParametersSpy = spyOn(service, 'mockServiceCallWithMultipleParameters').and.callThrough();
    service.getDataWithMultipleUndefinedParameters(undefined, undefined);
    expect(mockServiceCallWithMultipleParametersSpy).toHaveBeenCalledWith('Parameter1', 'Parameter2');


    const asyncData = await service.getDataWithMultipleUndefinedParameters(undefined, undefined);
    
    expect(asyncData).toEqual({ payload: ['Parameter1', 'Parameter2'] });
    expect(mockServiceCallWithMultipleParametersSpy).toHaveBeenCalledWith('Parameter1', 'Parameter2');
    
    service.getDataWithMultipleUndefinedParameters(undefined, undefined);
    expect(mockServiceCallWithMultipleParametersSpy).toHaveBeenCalledTimes(1);

    service.getDataWithMultipleUndefinedParameters('Parameter1', undefined);
    expect(mockServiceCallWithMultipleParametersSpy).toHaveBeenCalledTimes(2);
  });
});
