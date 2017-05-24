class BloomFilterRefresher {

  constructor(serviceWorkerCache, bloomFilterUrl, refreshInterval) {
    this.serviceWorkerCache = serviceWorkerCache;
    this.bloomFilterUrl = bloomFilterUrl;
    this.refreshInterval = refreshInterval;
    this.bloomFilterLoading = false;
  }

  ensureFreshness() {
    if (!this.bloomFilterLoading && !this.bloomFilterFresh()) {
      this.bloomFilterLoading = true;
      return this.refreshBloomfilter();
    }
    return Promise.resolve(false);
  }

  bloomFilterFresh() {
    return this.serviceWorkerCache.bloomFilter &&
        (this.serviceWorkerCache.bloomFilter.creation + this.refreshInterval) > Date.now();
  }

  async refreshBloomfilter() {
    try {
      const response = await fetch(this.bloomFilterUrl, {cache: 'default'});
      if (response.status !== 200) {
        throw new Error(`Bloomfilter fetch failed, status: ${response.status}`);
      }

      const data = await response.json();
      const bloomFilter = new BloomFilter(data);
      this.serviceWorkerCache.setBloomFilter(bloomFilter);
      this.bloomFilterLoading = false;
      return true;
    } catch (err) {
      setTimeout(() => this.bloomFilterLoading = false, 5000);
      return false;
    }

  }

}

module.exports = BloomFilterRefresher;