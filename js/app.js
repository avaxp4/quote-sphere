const { createApp, ref, computed, onMounted, watch } = Vue;

const SUPABASE_URL = 'https://sbfaeuozzacjsndrlbuc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNiZmFldW96emFjanNuZHJsYnVjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQxNzUzMTAsImV4cCI6MjA3OTc1MTMxMH0.dkLGDv2fa4cXAVjoZTugINqXGX_XjAM4kRJnbFf-YyM';

createApp({
    setup() {
        // State
        const activeTab = ref('home');
        const mobileMenuOpen = ref(false);
        const loading = ref(false);
        const error = ref(null);
        const isDarkMode = ref(false);
        
        const items = ref([]); 
        const selectedAuthor = ref(null);
        const selectedAuthorContents = ref([]);
        
        // Filtering
        const activeTag = ref(null);

        // Navigation Tabs
        const tabs = [
            { id: 'home', label: 'الرئيسية' },
            { id: 'quotes', label: 'أقوال مأثورة' },
            { id: 'poetry', label: 'شعر عربي' },
            { id: 'figures', label: 'شخصيات تاريخية' }
        ];

        // Computed
        const uniqueTags = computed(() => {
            const tags = new Set();
            items.value.forEach(item => {
                if (item.tags && Array.isArray(item.tags)) {
                    item.tags.forEach(tag => tags.add(tag));
                }
            });
            return Array.from(tags);
        });

        const filteredItems = computed(() => {
            if (!activeTag.value) return items.value;
            return items.value.filter(item => item.tags && item.tags.includes(activeTag.value));
        });

        // Format poetry text - replace different line break formats with actual line breaks
        const formatPoetry = (text) => {
            if (!text) return '';
            // Replace all common separators with line breaks:
            // 1. " ... " (three dots with spaces)
            // 2. "/n" (literal string)
            // 3. Already properly formatted "\n" will be preserved by white-space: pre-line
            return text
                .replace(/\s*\.\.\.\s*/g, '\n')  // Replace " ... " with line break
                .replace(/\/n/g, '\n');          // Replace "/n" with line break
        };

        // API Helpers
        const fetchFromSupabase = async (table, query = '') => {
            const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, {
                headers: {
                    'apikey': SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
                }
            });
            if (!response.ok) throw new Error(`Failed to fetch from ${table}`);
            return await response.json();
        };

        // Actions
        const loadView = async (viewId, param = null) => {
            activeTab.value = viewId;
            error.value = null;
            activeTag.value = null; // Reset filter on view change
            
            // Don't clear items immediately to avoid flickering if caching logic is added later
            // But for now, we clear to ensure fresh data or loading state
            if (viewId !== 'author_detail') {
                items.value = [];
            }

            if (viewId === 'home') return;

            loading.value = true;
            try {
                if (viewId === 'quotes') {
                    const data = await fetchFromSupabase('contents', 'type=eq.quote&select=*,author:authors(*)');
                    items.value = data;
                } else if (viewId === 'poetry') {
                    const data = await fetchFromSupabase('contents', 'type=eq.poem&select=*,author:authors(*)');
                    items.value = data;
                } else if (viewId === 'figures') {
                    const data = await fetchFromSupabase('authors', 'select=*');
                    items.value = data;
                } else if (viewId === 'author_detail' && param) {
                    // Fetch Author
                    const authors = await fetchFromSupabase('authors', `id=eq.${param}&select=*`);
                    if (authors.length > 0) {
                        selectedAuthor.value = authors[0];
                        // Fetch Contents
                        const contents = await fetchFromSupabase('contents', `author_id=eq.${param}&select=*`);
                        selectedAuthorContents.value = contents;
                    } else {
                        error.value = 'المؤلف غير موجود';
                    }
                }
            } catch (err) {
                console.error(err);
                error.value = 'حدث خطأ أثناء تحميل البيانات. يرجى التحقق من الاتصال.';
            } finally {
                loading.value = false;
            }
        };

        const handleHashChange = () => {
            const hash = window.location.hash.slice(1); // Remove #
            
            if (hash.startsWith('/author/')) {
                const id = hash.split('/')[2];
                loadView('author_detail', id);
            } else if (hash === '/quotes') {
                loadView('quotes');
            } else if (hash === '/poetry') {
                loadView('poetry');
            } else if (hash === '/figures') {
                loadView('figures');
            } else {
                loadView('home');
            }
            
            window.scrollTo(0, 0);
        };

        const toggleDarkMode = () => {
            isDarkMode.value = !isDarkMode.value;
            if (isDarkMode.value) {
                document.documentElement.classList.add('dark');
                localStorage.setItem('theme', 'dark');
            } else {
                document.documentElement.classList.remove('dark');
                localStorage.setItem('theme', 'light');
            }
        };

        const initTheme = () => {
            const savedTheme = localStorage.getItem('theme');
            if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                isDarkMode.value = true;
                document.documentElement.classList.add('dark');
            } else {
                isDarkMode.value = false;
                document.documentElement.classList.remove('dark');
            }
        };

        const filterByTag = (tag) => {
            activeTag.value = activeTag.value === tag ? null : tag;
        };

        const goBack = () => {
            window.history.back();
        };

        const copyText = (text) => {
            navigator.clipboard.writeText(text);
            // Optional: Toast
        };

        const retryFetch = () => {
            handleHashChange();
        };

        onMounted(() => {
            initTheme();
            window.addEventListener('hashchange', handleHashChange);
            handleHashChange(); // Handle initial load
        });

        return {
            activeTab,
            tabs,
            mobileMenuOpen,
            loading,
            error,
            items,
            selectedAuthor,
            selectedAuthorContents,
            isDarkMode,
            toggleDarkMode,
            uniqueTags,
            activeTag,
            filterByTag,
            filteredItems,
            goBack,
            copyText,
            retryFetch,
            formatPoetry
        };
    }
}).mount('#app');
