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
import com.inuker.bluetooth.library.d.a.h;
import java.util.Arrays;
import java.util.List;

public class f
extends a {
    private static final String[] d = new String[]{"android.bluetooth.adapter.action.STATE_CHANGED"};

    protected f(com.inuker.bluetooth.library.d.h h2) {
        super(h2);
    }

    @Override
    List<String> a() {
        return Arrays.asList(d);
    }

    public static f a(com.inuker.bluetooth.library.d.h h2) {
        return new f(h2);
    }

    @Override
    public boolean a(Context context, Intent intent) {
        int n2 = intent.getIntExtra("android.bluetooth.adapter.extra.STATE", 0);
        int n3 = intent.getIntExtra("android.bluetooth.adapter.extra.PREVIOUS_STATE", 0);
        com.inuker.bluetooth.library.e.a.c(String.format("state changed: %s -> %s", this.a(n3), this.a(n2)));
        this.a(n3, n2);
        return true;
    }

    private void a(int n2, int n3) {
        List<g> list = this.a(h.class);
        for (g g2 : list) {
            g2.invoke(n2, n3);
        }
    }

    private String a(int n2) {
        switch (n2) {
            case 12: {
                return "state_on";
            }
            case 10: {
                return "state_off";
            }
            case 13: {
                return "state_turning_off";
            }
            case 11: {
                return "state_turning_on";
            }
        }
        return "unknown";
    }
}

