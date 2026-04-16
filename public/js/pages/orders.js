const { createApp, ref, onMounted } = Vue;

createApp({
  setup() {
    if (!Auth.requireAuth()) return {};

    const orders = ref([]);
    const loading = ref(true);

    const statusMap = {
      pending: { label: '待付款', cls: 'bg-apricot/20 text-apricot' },
      paid: { label: '已付款', cls: 'bg-sage/20 text-sage' },
      failed: { label: '付款失敗', cls: 'bg-red-100 text-red-600' },
      cancelled: { label: '已取消', cls: 'bg-gray-100 text-gray-500' },
    };

    onMounted(async function () {
      try {
        const res = await apiFetch('/api/orders');
        orders.value = res.data.orders;
      } catch (e) {
        orders.value = [];
      } finally {
        loading.value = false;
      }

      const params = new URLSearchParams(window.location.search);
      if (params.get('cancel') === 'success') {
        Notification.show('訂單取消成功', 'success');
        window.history.replaceState(null, '', window.location.pathname);
      }
    });

    return { orders, loading, statusMap };
  }
}).mount('#app');
