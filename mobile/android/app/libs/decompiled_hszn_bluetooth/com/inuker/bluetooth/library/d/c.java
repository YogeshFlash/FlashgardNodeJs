/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  android.content.Context
 *  android.content.Intent
 */
package com.inuker.bluetooth.library.d;

import android.content.Context;
import android.content.Intent;
import com.inuker.bluetooth.library.d.a;
import com.inuker.bluetooth.library.d.a.g;
import com.inuker.bluetooth.library.d.h;
import java.util.Arrays;
import java.util.List;

public class c
extends a {
    private static final String[] d = new String[]{"action.connect_status_changed"};

    protected c(h h2) {
        super(h2);
    }

    public static c a(h h2) {
        return new c(h2);
    }

    @Override
    List<String> a() {
        return Arrays.asList(d);
    }

    @Override
    boolean a(Context context, Intent intent) {
        String string = intent.getStringExtra("extra.mac");
        int n2 = intent.getIntExtra("extra.status", 0);
        com.inuker.bluetooth.library.e.a.c(String.format("onConnectStatusChanged for %s, status = %d", string, n2));
        this.a(string, n2);
        return true;
    }

    private void a(String string, int n2) {
        List<g> list = this.a(com.inuker.bluetooth.library.d.a.c.class);
        for (g g2 : list) {
            g2.invoke(string, n2);
        }
    }
}

