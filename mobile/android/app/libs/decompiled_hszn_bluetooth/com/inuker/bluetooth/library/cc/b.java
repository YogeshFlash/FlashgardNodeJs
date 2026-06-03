/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  android.os.Handler
 *  android.os.HandlerThread
 */
package com.inuker.bluetooth.library.cc;

import android.os.Handler;
import android.os.HandlerThread;
import com.inuker.bluetooth.library.search.SearchResult;
import com.inuker.bluetooth.library.search.g;

public class b {
    private a a;
    private final Handler b;
    private com.inuker.bluetooth.library.a c;

    b(com.inuker.bluetooth.library.a a2, Handler handler) {
        this.b = handler;
        this.c = a2;
        HandlerThread handlerThread = new HandlerThread("bluetooth searcher handler");
        handlerThread.start();
    }

    private a a(final a a2) {
        return new a(){

            @Override
            public void a(final SearchResult searchResult) {
                b.this.a(new Runnable(){

                    @Override
                    public void run() {
                        a2.a(searchResult);
                    }
                });
            }

            @Override
            public void c() {
                b.this.a(new Runnable(){

                    @Override
                    public void run() {
                        a2.c();
                    }
                });
            }

            @Override
            public void a() {
                b.this.a(new Runnable(){

                    @Override
                    public void run() {
                        a2.a();
                    }
                });
            }

            @Override
            public void b() {
                b.this.a(new Runnable(){

                    @Override
                    public void run() {
                        a2.b();
                    }
                });
            }

            @Override
            public void a(final String string) {
                b.this.a(new Runnable(){

                    @Override
                    public void run() {
                        a2.a(string);
                    }
                });
            }
        };
    }

    public void a(final int n2, final a a2) {
        this.a(new Runnable(){

            @Override
            public void run() {
                b.this.a = b.this.a(a2);
                b.this.c.a(new g.a().b(n2).a(), b.this.a);
            }
        });
    }

    public void a() {
        this.c.a();
    }

    private void a(Runnable runnable) {
        this.b.post(runnable);
    }

    public static interface a
    extends com.inuker.bluetooth.library.search.c.b {
        @Override
        public void a(SearchResult var1);

        @Override
        public void c();

        @Override
        public void a();

        @Override
        public void b();

        public void a(String var1);
    }
}

