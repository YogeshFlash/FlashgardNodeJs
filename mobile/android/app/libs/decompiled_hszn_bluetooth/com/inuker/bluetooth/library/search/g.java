/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  android.os.Parcel
 *  android.os.Parcelable
 *  android.os.Parcelable$Creator
 */
package com.inuker.bluetooth.library.search;

import android.os.Parcel;
import android.os.Parcelable;
import com.inuker.bluetooth.library.e.b;
import com.inuker.bluetooth.library.search.h;
import java.util.ArrayList;
import java.util.List;

public class g
implements Parcelable {
    private List<h> b;
    public static final Parcelable.Creator<g> a = new Parcelable.Creator<g>(){

        public g a(Parcel parcel) {
            return new g(parcel);
        }

        public g[] a(int n2) {
            return new g[n2];
        }

        public /* synthetic */ Object[] newArray(int n2) {
            return this.a(n2);
        }

        public /* synthetic */ Object createFromParcel(Parcel parcel) {
            return this.a(parcel);
        }
    };

    public int describeContents() {
        return 0;
    }

    public void writeToParcel(Parcel parcel, int n2) {
        parcel.writeTypedList(this.b);
    }

    public g() {
    }

    protected g(Parcel parcel) {
        this.b = new ArrayList<h>();
        parcel.readTypedList(this.b, h.a);
    }

    public List<h> a() {
        return this.b;
    }

    public void a(List<h> list) {
        this.b = list;
    }

    public static class a {
        private List<h> a = new ArrayList<h>();

        public a a(int n2) {
            if (com.inuker.bluetooth.library.e.b.b()) {
                h h2 = new h();
                h2.a(2);
                h2.b(n2);
                this.a.add(h2);
            }
            return this;
        }

        public a a(int n2, int n3) {
            for (int i2 = 0; i2 < n3; ++i2) {
                this.a(n2);
            }
            return this;
        }

        public a b(int n2) {
            h h2 = new h();
            h2.a(1);
            h2.b(n2);
            this.a.add(h2);
            return this;
        }

        public a b(int n2, int n3) {
            for (int i2 = 0; i2 < n3; ++i2) {
                this.b(n2);
            }
            return this;
        }

        public g a() {
            g g2 = new g();
            g2.a(this.a);
            return g2;
        }
    }
}

